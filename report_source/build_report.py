"""Build the editable A4 AptiTest report from source-checked report content.
Dependencies: python-docx, Pillow. Convert/update the resulting DOCX with
LibreOffice (the PDF must be exported from the updated final DOCX).
"""
from pathlib import Path
import json, re
from docx import Document
from docx.shared import Inches, Pt, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.enum.section import WD_SECTION_START
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image
from content import PAGES

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parent/'AptiTest_Report_Output'
SCRATCH=ROOT.parent/'.local/report-scratch'
OUT.mkdir(exist_ok=True);SCRATCH.mkdir(parents=True,exist_ok=True)
TITLE='AptiTest – Dynamic Aptitude Test Management and Automated Evaluation System'
STUDENTS=[('Jeevan SB','NNM24CS105'),('MK Subramanya','NNM24CS124'),('Mayur D Shetty','NNM24CS136'),('Eashan S Gaikwaad','NNM24CS084')]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
D=Document()
bookmark_id=0
manifest=[]

def el(tag,attrs=None,text=None):
    e=OxmlElement('w:'+tag)
    for k,v in (attrs or {}).items():e.set(qn('w:'+k),str(v))
    if text is not None:e.text=text
    return e

def fmt_run(r,size=None,bold=None,italic=None,font='Arial'):
    r.font.name=font
    r._element.get_or_add_rPr().append(el('rFonts',{'ascii':font,'hAnsi':font,'eastAsia':font,'cs':font}))
    if size is not None:r.font.size=Pt(size)
    if bold is not None:r.bold=bold
    if italic is not None:r.italic=italic
    r.font.color.rgb=RGBColor(0,0,0)
    return r

def field(p,code,result='',hidden=False):
    for e in [el('fldChar',{'fldCharType':'begin'}),el('instrText',text=' '+code+' '),el('fldChar',{'fldCharType':'separate'}),el('t',text=result),el('fldChar',{'fldCharType':'end'})]:
        if e.tag==qn('w:instrText'):e.set(qn('xml:space'),'preserve')
        r=el('r')
        if hidden:r.append(el('rPr'));r[0].append(el('vanish'))
        r.append(e);p._p.append(r)

def tc(p,title):field(p,'TC "'+title+'" \\l "1"','',False)
def crossref_text(p,text):
    for part in re.split(r'(Figure \d+\.\d+)',text):
        if re.fullmatch(r'Figure \d+\.\d+',part):
            field(p,'REF label_'+part.replace(' ','_').replace('.','_')+' \\h',part)
        elif part:p.add_run(part)

def bookmark_label(p,label):
    global bookmark_id
    bookmark_id+=1
    name='label_'+label.replace('.','_').replace(' ','_')
    p._p.append(el('bookmarkStart',{'id':bookmark_id,'name':name}))
    fmt_run(p.add_run(label),10.5,bold=True)
    p._p.append(el('bookmarkEnd',{'id':bookmark_id}))

def set_section(s,top=25.4,bottom=20):
    s.page_width=Mm(210);s.page_height=Mm(297)
    s.left_margin=Mm(23);s.right_margin=Mm(14)
    s.top_margin=Mm(top);s.bottom_margin=Mm(bottom)
    s.header_distance=Mm(10);s.footer_distance=Mm(10)
    s.gutter=Mm(0)

def numbering(s,fmt,start):
    pr=s._sectPr
    for old in pr.findall(qn('w:pgNumType')):pr.remove(old)
    pr.append(el('pgNumType',{'fmt':fmt,'start':start}))

def clean_section_break():
    p=D.paragraphs[-1]
    p.paragraph_format.space_before=Pt(0);p.paragraph_format.space_after=Pt(0)
    p.paragraph_format.line_spacing=Pt(1)
    for r in p.runs:fmt_run(r,1)

def footer(s,body=False):
    f=s.footer;f.is_linked_to_previous=False
    p=f.paragraphs[0];p.paragraph_format.space_after=Pt(0);p.paragraph_format.line_spacing=1
    if body:
        p.paragraph_format.tab_stops.add_tab_stop(Mm(173),WD_TAB_ALIGNMENT.RIGHT)
        fmt_run(p.add_run('Dept of CSE, NMAMIT, Nitte'),10,bold=True)
        fmt_run(p.add_run('\tPage '),10,bold=True)
        field(p,'PAGE','1')
    else:
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER;field(p,'PAGE','ii')
    for r in p.runs:fmt_run(r,10 if body else 12,bold=body)

def header(s):
    hd=s.header;hd.is_linked_to_previous=False
    p=hd.paragraphs[0];p.paragraph_format.space_after=Pt(3);p.paragraph_format.line_spacing=1
    p.paragraph_format.tab_stops.add_tab_stop(Mm(173),WD_TAB_ALIGNMENT.RIGHT)
    fmt_run(p.add_run('AptiTest – Dynamic Aptitude Test Management\t2026–27\n'),9.5,bold=True)
    fmt_run(p.add_run('and Automated Evaluation System'),9.5,bold=True)
    p._p.get_or_add_pPr().append(el('pBdr'))
    p._p.get_or_add_pPr()[-1].append(el('bottom',{'val':'single','sz':'5','color':'666666','space':'5'}))

# The theme and every style explicitly declare Arial to avoid accidental Calibri.
for style in D.styles:
    if hasattr(style,'font'):
        style.font.name='Arial';style.font.size=Pt(12);style.font.color.rgb=RGBColor(0,0,0)
        pr=style.element.get_or_add_rPr()
        for rfonts in pr.findall(qn('w:rFonts')):pr.remove(rfonts)
        pr.insert(0,el('rFonts',{'ascii':'Arial','hAnsi':'Arial','eastAsia':'Arial','cs':'Arial'}))
        if style.type==1:
            style.paragraph_format.line_spacing=1.5
            style.paragraph_format.space_before=Pt(0);style.paragraph_format.space_after=Pt(6)
            style.paragraph_format.widow_control=True
normal=D.styles['Normal'];normal.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY
for name,size,center in [('Heading 1',16,True),('Heading 2',12,False),('Heading 3',12,False)]:
    st=D.styles[name];st.font.size=Pt(size);st.font.bold=True
    st.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    st.paragraph_format.space_before=Pt(0 if center else 8);st.paragraph_format.space_after=Pt(12 if center else 6)
    st.paragraph_format.line_spacing=1.3;st.paragraph_format.keep_with_next=True
for i in range(1,4):
    name=f'TOC {i}'
    if name not in D.styles:D.styles.add_style(name,1)
    st=D.styles[name];st.font.size=Pt(12);st.font.bold=(i==1)
    st.paragraph_format.line_spacing=1.5;st.paragraph_format.space_after=Pt(5)
    st.paragraph_format.space_before=Pt(4 if i==1 else 0)
    st.paragraph_format.left_indent=Mm(0 if i==1 else 5)
    st.paragraph_format.right_indent=Mm(0)
    st.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.LEFT
    st.paragraph_format.tab_stops.add_tab_stop(Mm(173 if i==1 else 168),WD_TAB_ALIGNMENT.RIGHT,WD_TAB_LEADER.DOTS)
for sty in ['Header','Footer']:
    D.styles[sty].paragraph_format.tab_stops.clear_all()
for sty in ['Hyperlink','FollowedHyperlink']:
    if sty in D.styles:D.styles[sty].font.color.rgb=RGBColor(0,0,0);D.styles[sty].font.underline=False
D.settings.element.append(el('mirrorMargins'))
D.settings.element.append(el('autoHyphenation',{'val':'false'}))
D.settings.element.append(el('updateFields',{'val':'true'}))
D.settings.element.append(el('defaultTabStop',{'val':'720'}))
# Update theme fonts as well as explicit runs.
from lxml import etree
for part in D.part.package.parts:
    if str(part.partname)=='/word/theme/theme1.xml':
        x=etree.fromstring(part.blob)
        for n in x.xpath('//*[local-name()="latin"]'):n.set('typeface','Arial')
        part._blob=etree.tostring(x,xml_declaration=True,encoding='UTF-8',standalone=True)

# COVER — original banner and hierarchy, adapted to A4.
s=D.sections[0];set_section(s,top=10,bottom=17);numbering(s,'lowerRoman',1)
s.header.is_linked_to_previous=False;s.footer.is_linked_to_previous=False

def cp(text='',size=14,bold=False,font='Times New Roman',before=0,after=0,align=WD_ALIGN_PARAGRAPH.CENTER,italic=False):
    p=D.add_paragraph();p.alignment=align
    pf=p.paragraph_format;pf.line_spacing=1.08;pf.space_before=Pt(before);pf.space_after=Pt(after)
    fmt_run(p.add_run(text),size,bold,italic,font)
    return p
p=D.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(0);p.paragraph_format.line_spacing=1
p.add_run().add_picture(str(ROOT/'assets/institution-cover.jpeg'),width=Inches(6.8));tc(p,'Title Page')
p=cp('Department of Computer Science & Engineering',13,True,'Arial',after=17)
p._p.get_or_add_pPr().append(el('pBdr'));p._p.get_or_add_pPr()[-1].append(el('bottom',{'val':'single','sz':8,'space':7}))
cp('Report on Mini Project',18,before=2,after=7)
cp('AptiTest – Dynamic Aptitude Test Management\nand Automated Evaluation System',21,bold=True,after=17)
cp('Course Code: CS3603-1',14,after=3)
cp('Course Name: Java and Spring Framework Lab',14,after=11)
cp('Semester: V SEM                       Section: B',14,after=5)
cp('Academic Year: 2026–2027',14,after=15)
cp('Submitted To:',16,True,after=4)
cp('Mr. Akhilraj V. Gadagkar',14,after=3)
cp('Assistant Professor Grade - II',14,after=3)
cp('Department of Computer Science and Engineering',14,after=3)
cp('NMAM Institute of Technology, Nitte',14,after=14)
cp('Submitted By:',16,True,after=4)
for name,usn in STUDENTS:cp(f'{name} ({usn})',14,after=3)
cp('Date of submission:',14,True,before=13,after=3)
cp('12/11/2026',15,after=0)
cp('________________________________',12,before=43,align=WD_ALIGN_PARAGRAPH.RIGHT)
cp('Signature of the Course Instructor',12,True,align=WD_ALIGN_PARAGRAPH.RIGHT)

# CERTIFICATE / front matter (roman ii onward).
s=D.add_section(WD_SECTION_START.NEW_PAGE);clean_section_break();set_section(s,top=13,bottom=20);numbering(s,'lowerRoman',2)
s.header.is_linked_to_previous=False;footer(s)
p=D.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(12);p.paragraph_format.line_spacing=1
p.add_run().add_picture(str(ROOT/'assets/institution-certificate.png'),width=Inches(6.75));tc(p,'Institution Certificate')
cp('CERTIFICATE',22,False,'Algerian',after=18)
p=D.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY;p.paragraph_format.line_spacing=1.65;p.paragraph_format.space_after=Pt(0)
parts=[('This is to certify that the Mini-Project report titled “',False),(TITLE,True),('” has been submitted by ',False)]
for i,(name,usn) in enumerate(STUDENTS):
    parts.append((('Mr. ' if i==0 else (' and Mr. ' if i==3 else ', Mr. '))+name+' ('+usn+')',True))
parts.extend([('. The above students of V SEM B.Tech., Section B, are bonafide students of NMAM Institute of Technology, Nitte, and have successfully completed the Mini-Project during ',False),('2026–2027',True),(' in ',False),('Computer Science and Engineering',True),(' at NMAM Institute of Technology, Nitte.',False)])
for t,bold in parts:fmt_run(p.add_run(t),13,bold,True)
p=cp('',12,before=76)
t=D.add_table(rows=1,cols=2);t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
for cell,width in zip(t.rows[0].cells,[4.35,2.4]):cell.width=Inches(width)
for cell,txt in zip(t.rows[0].cells,['________________________________\nName and Signature of the Course Instructor','________________________\nSignature of the HOD']):
    p=cell.paragraphs[0];p.paragraph_format.line_spacing=1.15;p.paragraph_format.space_after=Pt(0)
    for j,line in enumerate(txt.split('\n')):
        fmt_run(p.add_run(('\n' if j else '')+line),11.5,italic=True)

# ABSTRACT.
p=D.add_paragraph('ABSTRACT');p.alignment=WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.page_break_before=True;p.paragraph_format.space_before=Pt(30);p.paragraph_format.space_after=Pt(16)
fmt_run(p.runs[0],16,bold=True);tc(p,'Abstract')
p._p.get_or_add_pPr().append(el('pBdr'));p._p.get_or_add_pPr()[-1].append(el('bottom',{'val':'single','sz':'5','space':'9'}))
abstract=[
'AptiTest – Dynamic Aptitude Test Management and Automated Evaluation System is a web-based mini-project designed to support structured aptitude and technical practice for Computer Science and Information Technology students. It integrates question administration, configurable test generation, timed answering, automated evaluation and progress review within a single role-based application.',
'The implementation targets Java 17 and uses Spring Boot 3.5.16, Spring MVC, JSP/JSTL, Spring Security and Spring Data JPA. Persistent H2 is the default database, with an optional MySQL profile. Administrators manage categorized questions, review pending content, configure test templates and inspect student progress. Students register and verify accounts, choose practice settings, answer questions with saved state and review completed results and explanations.',
'Test generation filters approved questions by template settings and selected categories, optionally excludes previously viewed items and randomizes a unique subset. Per-attempt snapshots preserve the question text, accepted answers and grading rules. A server deadline, transactional state updates and idempotent submission govern the attempt lifecycle. Ten answer formats are evaluated using explicit rules for choices, numerical tolerance and units, fractions, ratios, booleans and normalized text. Revision attempts remain reviewable but are excluded from cumulative rankings and statistics.',
'The inspected seed file contains 238 questions, comprising 187 active and 51 pending items, and the bootstrap defines five templates. This report combines source inspection, independently recounted seed data and genuine repository screenshots. The repository documents 61 Java cases and 47 packaged HTTP acceptance checks; these results are attributed to that verification record and were not rerun for this report. External MySQL connectivity, provider delivery/live payments and production-scale performance are not established. The project provides an educational practice foundation, while content expansion, operational hardening and integration validation remain future work.'
]
for text in abstract:
    p=D.add_paragraph(text);p.paragraph_format.first_line_indent=Mm(6)
p=D.add_paragraph();fmt_run(p.add_run('Keywords: '),12,bold=True);p.add_run('aptitude practice, Spring MVC, JSP, automated evaluation, question snapshots, role-based access.')

# LIVE automatic TOC. Front matter is entered with hidden TC fields; chapters use headings.
p=D.add_paragraph('TABLE OF CONTENTS');p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.page_break_before=True
p.paragraph_format.space_before=Pt(24);p.paragraph_format.space_after=Pt(16);fmt_run(p.runs[0],16,bold=True);tc(p,'Table of Contents')
p=D.add_paragraph();p.paragraph_format.space_after=Pt(0)
field(p,'TOC \\o "1-2" \\h \\z \\u \\f','Contents will be generated by the document processor.')

# BODY section: Arabic numbering starts at 1; no odd-page section breaks or blank fillers.
s=D.add_section(WD_SECTION_START.NEW_PAGE);clean_section_break();set_section(s);numbering(s,'decimal',1);header(s);footer(s,True)

def caption(label,title,kind='Table',after=False):
    p=D.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    pf=p.paragraph_format;pf.line_spacing=1.15;pf.space_before=Pt(3 if after else 7);pf.space_after=Pt(7);pf.keep_with_next=not after
    bookmark_label(p,kind+' '+label)
    fmt_run(p.add_run('  '+title),10.5)
    return p

def make_table(label,title,headers,rows,widths):
    caption(label,title)
    t=D.add_table(rows=1,cols=len(headers));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
    if widths is None:widths=[6.75/len(headers)]*len(headers)
    for col,w in zip(t.columns,widths):col.width=Inches(w)
    pr=t._tbl.tblPr
    borders=el('tblBorders')
    for side in ['top','left','bottom','right','insideH','insideV']:borders.append(el(side,{'val':'single','sz':'4','color':'A0A0A0'}))
    pr.append(borders)
    margins=el('tblCellMar')
    for side in ['top','bottom']:margins.append(el(side,{'w':'80','type':'dxa'}))
    for side in ['left','right']:margins.append(el(side,{'w':'95','type':'dxa'}))
    pr.append(margins)
    for n,values in enumerate([headers]+list(rows)):
        row=t.rows[0] if n==0 else t.add_row()
        row._tr.get_or_add_trPr().append(el('cantSplit'))
        if n==0:row._tr.get_or_add_trPr().append(el('tblHeader'))
        for cell,value,width in zip(row.cells,values,widths):
            cell.width=Inches(width);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if n==0:cell._tc.get_or_add_tcPr().append(el('shd',{'fill':'E7E7E7'}))
            p=cell.paragraphs[0];p.alignment=WD_ALIGN_PARAGRAPH.LEFT
            pf=p.paragraph_format;pf.line_spacing=1.1;pf.space_before=Pt(0);pf.space_after=Pt(0);pf.keep_with_next=(n==0)
            fmt_run(p.add_run(str(value)),11,bold=(n==0))
    p=D.add_paragraph();p.paragraph_format.line_spacing=Pt(2);p.paragraph_format.space_after=Pt(3)
    for r in p.runs:fmt_run(r,2)

for idx,blocks in enumerate(PAGES):
    first=True;page_labels=[]
    for block in blocks:
        typ=block[0]
        if typ in ['h1','h2','minor']:
            text=block[1]
            level=1 if typ=='h1' else (3 if re.match(r'^\d+\.\d+\.\d+',text) else 2)
            p=D.add_paragraph(text,style=f'Heading {level}' if typ!='minor' else None)
            if typ=='minor':fmt_run(p.runs[0],12,bold=True)
            if first and idx>0:p.paragraph_format.page_break_before=True
            if first:p.paragraph_format.space_before=Pt(0)
            page_labels.append(text)
        elif typ=='p':
            p=D.add_paragraph();crossref_text(p,block[1]);p.paragraph_format.first_line_indent=Mm(6)
            if idx>=31:
                p.alignment=WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.left_indent=Mm(6);p.paragraph_format.first_line_indent=Mm(-6)
        elif typ=='bullets':
            for text in block[1]:
                p=D.add_paragraph();p.paragraph_format.left_indent=Mm(5);p.paragraph_format.first_line_indent=Mm(-5)
                p.add_run('•  '+text)
        elif typ=='note':
            p=D.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.LEFT;p.paragraph_format.line_spacing=1.1;p.paragraph_format.space_before=Pt(3);p.paragraph_format.space_after=Pt(4)
            fmt_run(p.add_run(block[1]),9.5,italic=True)
        elif typ=='formula':
            p=D.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_before=Pt(3);p.paragraph_format.space_after=Pt(4)
            fmt_run(p.add_run(block[1]),12,bold=True)
        elif typ=='table':make_table(*block[1:])
        elif typ=='image':
            _,label,title,path,width=block
            p=D.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.line_spacing=1;p.paragraph_format.space_after=Pt(0);p.paragraph_format.keep_with_next=True
            run=p.add_run();pic=run.add_picture(str(ROOT/'assets'/path),width=Inches(width))
            # Alt text is real descriptive metadata, not a visual annotation.
            pic._inline.docPr.set('descr',title)
            caption(label,title,'Figure',True)
        else:raise ValueError(typ)
        first=False
    manifest.append({'intended_body_page':idx+1,'headings':page_labels})

# Document metadata: academic authors, not tool/provider names.
D.core_properties.title=TITLE
D.core_properties.subject='CS3603-1 — Java and Spring Framework Lab | V Semester, Section B | 2026–2027'
D.core_properties.author='; '.join(name for name,_ in STUDENTS)
D.core_properties.keywords='AptiTest; NMAM Institute of Technology, Nitte; mini-project report'
D.core_properties.comments='Editable academic report. Source and evidence scope are described in Chapter 6.'
D.core_properties.last_modified_by='AptiTest Project Team'
D.save(SCRATCH/'AptiTest_Report_Draft.docx')
(ROOT/'page_manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print('Draft:',SCRATCH/'AptiTest_Report_Draft.docx')
print('Intended body pages:',len(PAGES),'plus front matter with a live automatic TOC.')
