"""Check final DOCX/PDF, pagination, source prose, TOC, figures and re-export.
Requires python-docx, PyMuPDF, Pillow, lxml. This does NOT run Java tests.
Full-resolution review renders go under .local, never into the source patch.
"""
from pathlib import Path
import sys,json,hashlib,zipfile,re,unicodedata
from collections import Counter
from lxml import etree
from PIL import Image, ImageDraw
import fitz
from content import PAGES
ROOT=Path(__file__).resolve().parent
OUT=ROOT.parent/'AptiTest_Report_Output'
QA=ROOT.parent/'.local/report-qa'
QA.mkdir(parents=True,exist_ok=True);(QA/'pages').mkdir(exist_ok=True);(QA/'contact-sheets').mkdir(exist_ok=True)
DOCX=OUT/'AptiTest_Mini_Project_Report.docx'
PDF=OUT/'AptiTest_Mini_Project_Report.pdf'
REPEAT=QA/'independent-reconversion.pdf'
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS={'w':W}
failures=[];checks=Counter()
def check(ok,message):
    checks['total']+=1
    if not ok:failures.append(message)
def norm(t):return ''.join(c.lower() for c in unicodedata.normalize('NFKC',t) if c.isalnum())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
D=fitz.open(PDF)
check(len(D)==38,'Expected 38 visible pages')
check(len(PAGES)==33,'Expected 33 main-body page plans')
with zipfile.ZipFile(DOCX) as z:
    check(z.testzip() is None,'Invalid DOCX ZIP member')
    names=z.namelist()
    doc=etree.fromstring(z.read('word/document.xml'))
    settings=etree.fromstring(z.read('word/settings.xml'))
    styles=etree.fromstring(z.read('word/styles.xml'))
    normal=styles.xpath('//w:style[@w:styleId="Normal"]',namespaces=NS)[0]
    rf=normal.find('w:rPr/w:rFonts',NS)
    check(rf.get('{'+W+'}ascii')=='Arial' and rf.get('{'+W+'}hAnsi')=='Arial','Main body font is not Arial')
    check(normal.find('w:rPr/w:sz',NS).get('{'+W+'}val')=='24','Main body is not 12 point')
    check(normal.find('w:pPr/w:spacing',NS).get('{'+W+'}line')=='360','Main body is not 1.5 line spaced')
    check(not any(n.lower().endswith('.pdf') for n in names),'PDF must not be embedded inside the Word document')
    check(settings.find('w:mirrorMargins',NS) is not None,'Mirror margins missing')
    check(settings.find('w:updateFields',NS) is not None,'Automatic field update flag missing')
    check(len(doc.xpath('//w:tbl',namespaces=NS))==20,'Expected 19 report tables and one unsigned certificate layout table')
    check(len(doc.xpath('//w:drawing',namespaces=NS))==11,'Expected 9 figures plus 2 original institutional banners')
    instructions=doc.xpath('//w:instrText/text()',namespaces=NS)
    check(sum(' TOC ' in t for t in instructions)==1,'Expected one live automatic TOC')
    check(sum(' REF ' in t for t in instructions)==3,'Expected 3 live figure cross-references')
    check(sum(n.endswith('.odttf') for n in names)==7,'Expected portable embedded editable font faces')
    app=etree.fromstring(z.read('docProps/app.xml'))
    count=next(int(e.text) for e in app if etree.QName(e).localname=='Pages')
    check(count==len(D),'DOCX cached page count differs from visible PDF')
    sections=doc.xpath('//w:sectPr',namespaces=NS)
    check(len(sections)==3,'Expected cover, roman front matter and Arabic body sections')
    for s in sections:
        size=s.find('w:pgSz',NS)
        check(abs(int(size.get('{'+W+'}w'))-11906)<=1 and abs(int(size.get('{'+W+'}h'))-16838)<=1,'Word page size is not A4')
    num=[(s.find('w:pgNumType',NS).get('{'+W+'}fmt'),s.find('w:pgNumType',NS).get('{'+W+'}start')) for s in sections]
    check(num==[('lowerRoman','1'),('lowerRoman','2'),('decimal','1')],'Incorrect page-number format/restart')
    # Every substantive Word paragraph/cell must be represented in PDF text.
    word_paras=[]
    for p in doc.xpath('//w:p',namespaces=NS):
        t=''.join(p.xpath('.//w:t/text()',namespaces=NS))
        if len(norm(t))>12:word_paras.append(t)
    all_pdf_norm=norm('\n'.join(p.get_text() for p in D))
    for t in word_paras:check(norm(t) in all_pdf_norm,'Word text absent from PDF: '+t[:100])
    # Read the actually cached automatic table, not a second manually written TOC.
    toc=doc.xpath('//w:sdtContent[w:p//w:instrText[contains(text(),"TOC ")]]',namespaces=NS)
    entries=[]
    for p in toc[0].findall('w:p',NS):
        words=p.xpath('.//w:t/text()',namespaces=NS)
        if words:entries.append((''.join(words[:-1]),words[-1]))
    front=[('Title Page','i'),('Institution Certificate','ii'),('Abstract','iii'),('Table of Contents','iv')]
    check(entries[:4]==front,'TOC front-matter entries are incorrect')
    toc_pdf=norm(D[3].get_text()+D[4].get_text())
    for title,number in entries:
        check(norm(title+number) in toc_pdf,'Cached Word/PDF TOC mismatch: '+title)
        if number.isdecimal():
            physical=int(number)+4
            check(norm(title) in norm(D[physical].get_text()),'TOC page reference is wrong: '+title+' -> '+number)

# Validate every planned paragraph, heading, table cell and caption on its real page.
for idx,blocks in enumerate(PAGES):
    text=norm(D[idx+5].get_text())
    for item in blocks:
        kind=item[0]
        if kind in ['p','h1','h2','minor','note','formula']:expected=[item[1]]
        elif kind=='bullets':expected=item[1]
        elif kind=='image':expected=['Figure '+item[1]+' '+item[2]]
        elif kind=='table':expected=['Table '+item[1]+' '+item[2]]+list(item[3])+[v for row in item[4] for v in row]
        else:raise ValueError(kind)
        for t in expected:
            check(norm(str(t)) in text,f'Content omitted/spilled from main page {idx+1}: {str(t)[:100]}')

# Identity and absence of original sample material.
front_text='\n'.join(p.get_text() for p in list(D)[:3])
identities=[('Jeevan SB','NNM24CS105'),('MK Subramanya','NNM24CS124'),('Mayur D Shetty','NNM24CS136'),('Eashan S Gaikwaad','NNM24CS084')]
for i in [0,1]:
    n=norm(D[i].get_text());positions=[]
    for name,usn in identities:
        check(norm(name+' '+usn) in n,f'Identity absent on page {i+1}: '+name)
        positions.append(n.find(norm(name)))
    check(positions==sorted(positions),'Student order changed')
for phrase in ['NMAM Institute of Technology, Nitte','Department of Computer Science & Engineering','CS3603-1','Java and Spring Framework Lab','Mr. Akhilraj V. Gadagkar','Assistant Professor Grade - II','12/11/2026','2026–2027']:
    check(norm(phrase) in norm(front_text),'Official identity missing: '+phrase)
whole='\n'.join(p.get_text() for p in D)
for bad in ['Abhinav Bindra','Bharath Kumar','Chandan Shetty','David Jose','NNM24CS111','NNM24CS222','NNM24CS333','NNM24CS444','Project title goes here','Student Name (USN)','[Pick the','TYPE THE DOCUMENT TITLE','Contents will be generated','Job Connect','Job Portal with Event']:
    check(bad.casefold() not in whole.casefold(),'Unreplaced sample/reference text: '+bad)
check('\ufffd' not in whole,'PDF contains replacement glyphs')

pages=[];images=[];font_names=set()
expected_images={1:1,2:1,12:1,14:1,19:1,28:1,29:1,30:1,31:1,32:1,33:1}
for i,page in enumerate(D):
    number=i+1;text=page.get_text()
    check(abs(page.rect.width-595.276)<.2 and abs(page.rect.height-841.89)<.2,f'PDF page {number} is not A4')
    check(len(text.strip())>100,f'Blank/orphan page {number}')
    for b in page.get_text('dict')['blocks']:
        for line in b.get('lines',[]):
            for span in line.get('spans',[]):
                font_names.add(span['font']);x0,y0,x1,y1=span['bbox']
                check(x0>=12 and x1<=page.rect.width-12 and y0>=12 and y1<=page.rect.height-12,f'Text clipped outside safe page bounds on page {number}: '+span['text'])
    infos=page.get_image_info()
    check(len(infos)==expected_images.get(number,0),f'Figure/banner count mismatch on page {number}')
    for info in infos:
        box=fitz.Rect(info['bbox']);ratio=box.width/box.height;original=info['width']/info['height']
        check(abs(ratio/original-1)<.005,f'Distorted image on page {number}')
        check(box.x0>=14 and box.x1<=page.rect.width-14 and box.y0>=12 and box.y1<=page.rect.height-35,f'Image crosses page bounds on page {number}')
        images.append({'pdf_page':number,'bbox':[round(v,2) for v in box],'pixel_size':[info['width'],info['height']]})
    if i>=5:check('Page '+str(i-4) in text,f'Wrong Arabic footer on PDF page {number}')
    if i in [1,2,3,4]:check(['ii','iii','iv','v'][i-1] in text.splitlines()[:2],f'Wrong roman footer on page {number}')
    path=QA/'pages'/f'page-{number:02}-final.png'
    page.get_pixmap(matrix=fitz.Matrix(1.7,1.7)).save(path)
    pages.append({'pdf_page':number,'main_page':i-4 if i>=5 else None,'text_characters':len(text),'image_count':len(infos)})

# A new independent export from the exact final DOCX must have identical text,
# image geometry and pixels on every page, not merely the same length.
check(REPEAT.exists(),'Independent DOCX reconversion was not performed')
# Use fresh document handles at the same initial render scale: MuPDF caches
# resampled images, so comparing an already-rendered 1.7x document with a
# fresh 1.25x document can otherwise create artificial interpolation diffs.
fitz.TOOLS.store_shrink(100)
C=fitz.open(PDF);R=fitz.open(REPEAT);check(len(R)==len(C),'Independent reconversion page count mismatch')
identical=0
for i,(a,b) in enumerate(zip(C,R)):
    check(a.get_text()==b.get_text(),f'Reconversion text differs on page {i+1}')
    pix1=a.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False)
    pix2=b.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False)
    same=(pix1.width,pix1.height,pix1.samples)==(pix2.width,pix2.height,pix2.samples)
    check(same,f'Reconversion pixels differ on page {i+1}')
    identical+=same

# Fresh overview sheets allow a full visual pagination sweep without retaining
# large rendered files in the Git patch.
for start in range(0,len(D),9):
    count=min(9,len(D)-start);rows=(count+2)//3
    sheet=Image.new('RGB',(1140,rows*590),'#c8c8c8');draw=ImageDraw.Draw(sheet)
    for i in range(start,min(start+9,len(D))):
        im=Image.open(QA/'pages'/f'page-{i+1:02}-final.png');im.thumbnail((366,540))
        x=((i-start)%3)*380+7;y=((i-start)//3)*590+28
        sheet.paste(im,(x,y));draw.text((x+140,y-20),f'PDF {i+1}',fill='black')
    sheet.save(QA/'contact-sheets'/f'final-sheet-{start//9+1}.jpg')

result={
 'status':'PASS' if not failures else 'FAIL','visible_pages':len(D),'front_matter_pages':5,'main_pages':33,
 'checks':checks['total'],'failures':failures,'independent_reconversion_pixel_identical_pages':identical,
 'automatic_toc_entries':len(entries),'live_figure_cross_references':3,'report_tables':19,'technical_diagrams':3,'genuine_application_figures':6,
 'font_families_used_in_pdf':sorted(font_names),
 'files':{p.name:{'bytes':p.stat().st_size,'sha256':sha(p)} for p in [DOCX,PDF]},
 'application_test_scope':'Source/test inspection and static seed recount only. Repository-documented 61 Java cases and 47 HTTP checks were NOT rerun for this report.',
 'template_limit':'Original attached template was a PDF, not DOCX; editable layout recreated for A4.',
 'screenshot_provenance':'Six original captures from MKSubrahmanya12345/Aptitest-JSF revision d23b6e798b4c82222642ab03a7ba9f8f1b72163c. Three explicitly captioned crops; no fabricated screens.',
 'images':images,'pages':pages
}
(ROOT/'qa_results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['images','pages']},indent=2,ensure_ascii=False))
if failures:sys.exit(1)
