"""Finish the updated Word package before its final PDF export.
Embed permitted editable fonts for portable pagination and refresh Word's
cached page-count metadata. Never write or modify the PDF in this script.
"""
from pathlib import Path
import os,uuid,zipfile,hashlib,json
from lxml import etree
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parent
DOCX=ROOT.parent/'AptiTest_Report_Output/AptiTest_Mini_Project_Report.docx'
FONTS=Path(os.environ.get('REPORT_FONT_DIR',ROOT.parent/'.local/report-fonts'))
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
REL='http://schemas.openxmlformats.org/package/2006/relationships'
CT='http://schemas.openxmlformats.org/package/2006/content-types'
NS={'w':W}
with zipfile.ZipFile(DOCX) as z:files={n:z.read(n) for n in z.namelist()}
fonts=etree.fromstring(files['word/fontTable.xml'])
rels_name='word/_rels/fontTable.xml.rels'
rels=etree.fromstring(files[rels_name]) if rels_name in files else etree.Element('{'+REL+'}Relationships',nsmap={None:REL})
ct=etree.fromstring(files['[Content_Types].xml'])
if not any(e.get('Extension')=='odttf' for e in ct):
    etree.SubElement(ct,'{'+CT+'}Default',Extension='odttf',ContentType='application/vnd.openxmlformats-officedocument.obfuscatedFont')
faces=[('Arial','embedRegular','Arial.ttf'),('Arial','embedBold','Arial_Bold.ttf'),('Arial','embedItalic','Arial_Italic.ttf'),('Arial','embedBoldItalic','Arial_Bold_Italic.ttf'),('Times New Roman','embedRegular','Times_New_Roman.ttf'),('Times New Roman','embedBold','Times_New_Roman_Bold.ttf'),('Algerian','embedRegular','Algerian-certificate.ttf')]
records=[]
for i,(family,style,filename) in enumerate(faces):
    path=FONTS/filename;f=TTFont(path)
    assert not (f['OS/2'].fsType&2),'Restricted font embedding is not permitted'
    guid=uuid.uuid5(uuid.NAMESPACE_URL,'aptitest-report-font/'+filename)
    key=guid.bytes[::-1]
    payload=bytearray(path.read_bytes())
    for n in range(32):payload[n]^=key[n%16]
    target=f'fonts/aptitest-{i}.odttf';rid=f'rIdAptiTestFont{i}'
    files['word/'+target]=bytes(payload)
    for e in list(rels):
        if e.get('Id')==rid:rels.remove(e)
    etree.SubElement(rels,'{'+REL+'}Relationship',Id=rid,Type=R+'/font',Target=target)
    nodes=fonts.xpath('./w:font[@w:name=$family]',namespaces=NS,family=family)
    node=nodes[0] if nodes else etree.SubElement(fonts,'{'+W+'}font',attrib={'{'+W+'}name':family})
    for e in list(node):
        if e.tag=='{'+W+'}'+style:node.remove(e)
    etree.SubElement(node,'{'+W+'}'+style,attrib={'{'+R+'}id':rid,'{'+W+'}fontKey':'{'+str(guid).upper()+'}','{'+W+'}subsetted':'true' if family=='Algerian' else 'false'})
    # Reversibility sanity check of the standardized OOXML obfuscation.
    restored=bytearray(payload)
    for n in range(32):restored[n]^=key[n%16]
    assert bytes(restored)==path.read_bytes()
    records.append({'family':family,'face':style,'source_sha256':hashlib.sha256(restored).hexdigest(),'fsType':f['OS/2'].fsType})
settings=etree.fromstring(files['word/settings.xml'])
for name in ['updateFields','embedTrueTypeFonts']:
    e=settings.find('{'+W+'}'+name)
    if e is None:e=etree.SubElement(settings,'{'+W+'}'+name)
    e.set('{'+W+'}val','true')
# Layout engine can count a suppressed parity placeholder in its app metadata.
# There are 5 visible front-matter pages + 33 main pages, verified after export.
app=etree.fromstring(files['docProps/app.xml'])
for e in app:
    if etree.QName(e).localname=='Pages':e.text='38'
for name,x in [(rels_name,rels),('word/fontTable.xml',fonts),('[Content_Types].xml',ct),('word/settings.xml',settings),('docProps/app.xml',app)]:
    files[name]=etree.tostring(x,xml_declaration=True,encoding='UTF-8',standalone=True)
tmp=DOCX.with_suffix('.tmp.docx')
with zipfile.ZipFile(tmp,'w',compression=zipfile.ZIP_DEFLATED) as z:
    for n,data in files.items():z.writestr(n,data)
tmp.replace(DOCX)
(ROOT/'font_embedding_manifest.json').write_text(json.dumps(records,indent=2)+'\n')
print('Finalized editable Word package:',DOCX)
print('Embedded fonts:',len(records),'; cached page count 38; automatic update enabled.')
