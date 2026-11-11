"""Draw source-verified AptiTest diagrams, not application screenshots.
Run with Pillow installed; REPORT_FONT_DIR must contain the Arial faces.
"""
from pathlib import Path
import os, math
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONTS = Path(os.environ.get('REPORT_FONT_DIR', ROOT.parent / '.local/report-fonts'))
OUT = ROOT / 'assets/diagrams'
OUT.mkdir(parents=True, exist_ok=True)
INK = '#17252c'
LINE = '#48606b'
FILL = '#eef2f4'
ACCENT = '#dce6eb'
WHITE = 'white'

def font(size, bold=False):
    return ImageFont.truetype(str(FONTS / ('Arial_Bold.ttf' if bold else 'Arial.ttf')), size)

class Canvas:
    def __init__(self, w, h):
        self.im = Image.new('RGB', (w,h), WHITE)
        self.d = ImageDraw.Draw(self.im)
    def text(self, xy, text, size=35, bold=False, anchor='mm', fill=INK):
        self.d.multiline_text(xy, text, font=font(size,bold), fill=fill, anchor=anchor, align='center', spacing=12)
    def box(self, bounds, title, lines=(), title_size=39, text_size=34):
        x1,y1,x2,y2 = bounds
        self.d.rounded_rectangle(bounds, radius=15, fill=FILL, outline=LINE, width=3)
        self.d.rounded_rectangle((x1,y1,x2,y1+83), radius=15, fill=ACCENT, outline=LINE, width=3)
        self.d.rectangle((x1+3,y1+50,x2-3,y1+82), fill=ACCENT)
        self.d.line((x1,y1+83,x2,y1+83), fill=LINE, width=2)
        self.text(((x1+x2)/2,y1+43),title,title_size,True)
        y=y1+105
        for line in lines:
            self.d.text((x1+26,y),line,font=font(text_size),fill=INK)
            y+=40
    def arrow(self, points, label=None, label_xy=None, dashed=False, width=4):
        if dashed:
            for (x1,y1),(x2,y2) in zip(points,points[1:]):
                length=math.hypot(x2-x1,y2-y1)
                for start in range(0,int(length),24):
                    end=min(start+13,length)
                    if length:
                        self.d.line((x1+(x2-x1)*start/length,y1+(y2-y1)*start/length,x1+(x2-x1)*end/length,y1+(y2-y1)*end/length),fill=LINE,width=width)
        else:self.d.line(points,fill=LINE,width=width,joint='curve')
        a,b=points[-2:];theta=math.atan2(b[1]-a[1],b[0]-a[0]);sz=20
        self.d.polygon([b,(b[0]-sz*math.cos(theta-.45),b[1]-sz*math.sin(theta-.45)),(b[0]-sz*math.cos(theta+.45),b[1]-sz*math.sin(theta+.45))],fill=LINE)
        if label:
            x,y=label_xy;bb=self.d.textbbox((x,y),label,font=font(31),anchor='mm')
            self.d.rectangle((bb[0]-8,bb[1]-5,bb[2]+8,bb[3]+5),fill=WHITE)
            self.text((x,y),label,31)
    def save(self, name):self.im.save(OUT/name,dpi=(300,300),optimize=True)

# The services are a single Spring Boot WAR, not separately deployed microservices.
c=Canvas(1800,1580)
c.box((140,35,1660,220),'Student / Administrator browser',('HTML + CSS + JavaScript; JSP-generated forms and pages',),43,37)
c.arrow([(900,220),(900,300)],'HTTPS / session cookie / CSRF token',(1240,260))
c.box((140,300,1660,485),'Spring Security filter chain',('Form login, role checks, account-state / credential-version checks',),43,37)
c.arrow([(900,485),(900,555)])
c.box((140,555,1660,740),'Spring MVC controllers + JSP / JSTL views',('Auth, Student, Test, Admin, Profile and Payment controllers',),43,37)
c.arrow([(900,740),(900,810)])
c.box((140,810,1660,1040),'Transactional application services',('Account | Question | Template | Attempt | Grading | Analytics', 'Payment and Mail adapters; ExpiredAttemptJob calls AttemptService'),43,35)
c.arrow([(900,1040),(900,1110)])
c.box((140,1110,1660,1295),'Spring Data JPA repositories / Hibernate',('Six mapped entities; foreign keys, indexes, transactions and locks',),43,37)
c.arrow([(900,1295),(900,1360)])
c.box((140,1360,1660,1550),'Relational persistence',('Default: persistent file-based H2  |  Optional profile: MySQL',),43,37)
c.save('architecture.png')

# Explicit workflow follows the locks, ownership/expiry guards and immutable snapshots.
c=Canvas(1800,2050)
def flow_box(bounds,title,lines=()):c.box(bounds,title,lines,40,35)
flow_box((170,25,1630,205),'Authenticated student selects a template',('Choose categories and whether previously seen items may repeat.',))
c.arrow([(900,205),(900,275)])
flow_box((170,275,1630,455),'Lock user; check active attempt and access',('Resume an active attempt; otherwise validate template / paid access.',))
c.arrow([(900,455),(900,525)])
flow_box((170,525,1630,755),'Build active, filtered question pool',('Exclude viewed questions unless includeSeen is enabled.', 'Reject an insufficient pool without creating a partial attempt.'))
c.arrow([(900,755),(900,825)])
flow_box((170,825,1630,1055),'Shuffle; select unique questions; persist snapshots',('Record template settings, startedAt and absolute expiresAt.', 'The selected question text, answers and grading rules are frozen.'))
c.arrow([(900,1055),(900,1125)])
flow_box((170,1125,1630,1355),'Visit, answer, review flag and save',('Ownership and deadline are checked on each server operation.', 'Autosave / navigation persist answers; refresh resumes saved state.'))
c.arrow([(900,1355),(900,1425)],'Repeat until submit or expiry',(1250,1392))
flow_box((170,1425,1630,1655),'Lock attempt; grade saved snapshots once',('Student submit, server expiry check or scheduled expiry worker.', 'Late writes cannot alter a completed or expired attempt.'))
c.arrow([(900,1655),(900,1725)])
flow_box((170,1725,1630,1955),'Persist result; show review, history and analytics',('Correct / wrong / skipped counts, score, elapsed time and solutions.', 'Optional revision reuses snapshots but is excluded from rankings.'))
c.save('test-workflow.png')

# ER model: every connecting edge is backed by an annotated ManyToOne association.
c=Canvas(1800,1850)
c.box((70,45,825,365),'at_users',('PK id; version', 'name; email (UNIQUE)', 'passwordHash; role', 'enabled; emailVerified', 'credentialsVersion; token hashes'),40,34)
c.box((1015,45,1770,365),'at_templates',('PK id; name; active', 'difficulty; questionCount', 'durationSeconds; filter CSVs', 'paid; pricePaise', 'allowReattempt'),40,34)
c.box((70,650,825,1020),'at_attempts',('PK id; version', 'FK user_id; FK template_id (NULL)', 'FK original_attempt_id (NULL)', 'templateName; status; expiresAt', 'correct / wrong / skipped totals', 'currentPosition; elapsedSeconds'),40,33)
c.box((1015,650,1770,1020),'at_payments',('PK id', 'FK user_id; FK template_id', 'orderId (UNIQUE)', 'gatewayPaymentId (UNIQUE)', 'gateway; status; amountPaise', 'createdAt'),40,34)
c.box((70,1300,825,1675),'at_attempt_questions',('PK id; FK attempt_id', 'FK question_id; position', 'question / answer / rule snapshot', 'userAnswer; flagged; correct', 'viewedAt; timeTakenMillis', 'UNIQUE (attempt_id, position)'),40,33)
c.box((1015,1300,1770,1675),'at_questions',('PK id; category; subcategory', 'difficulty; questionType; status', 'questionText; optionsJson', 'correctAnswerJson; config JSON', 'solution; sourceRef', 'createdAt; updatedAt'),40,34)
# Parent -> dependent arrows, with cardinalities located at the entity ends.
c.arrow([(250,365),(250,650)])
c.text((210,405),'1',33);c.text((210,605),'0..*',33)
c.arrow([(1545,365),(1545,650)])
c.text((1595,405),'1',33);c.text((1595,605),'0..*',33)
c.arrow([(825,245),(900,245),(900,495),(1190,495),(1190,650)])
c.text((856,207),'1',33);c.text((1250,605),'0..*',33)
# Optional template relation; the small white bridge marks the crossing as not a join.
c.arrow([(1015,300),(950,300),(950,560),(540,560),(540,650)],dashed=True)
c.d.rectangle((936,477,965,510),fill=WHITE)
c.d.arc((935,472,967,515),-90,90,fill=LINE,width=4)
c.text((992,338),'0..1',31);c.text((595,605),'0..*',33)
c.arrow([(250,1020),(250,1300)])
c.text((210,1070),'1',33);c.text((210,1255),'0..*',33)
c.arrow([(1015,1500),(825,1500)])
c.text((975,1450),'1',33);c.text((872,1450),'0..*',33)
c.text((920,1760),'PK: primary key   FK: foreign key   NULL: optional reference',34)
c.text((920,1810),'at_attempts also has an optional self-reference to an original attempt.',33)
c.save('entity-relationships.png')
print('Generated three source-verified diagrams in',OUT)
