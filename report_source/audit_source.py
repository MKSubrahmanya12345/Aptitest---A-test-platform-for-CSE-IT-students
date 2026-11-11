"""Static audit of the named technical source. Does not run application tests.
SOURCE_ROOT defaults to .local/technical-source, a pinned repository snapshot.
"""
from pathlib import Path
import os,json,re,hashlib,xml.etree.ElementTree as ET
from collections import Counter
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parent
SRC=Path(os.environ.get('SOURCE_ROOT',ROOT.parent/'.local/technical-source'))
REV='d23b6e798b4c82222642ab03a7ba9f8f1b72163c'
def read(p):return (SRC/p).read_text()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
rows=json.loads(read('src/main/resources/seed/questions.json'))
active=[r for r in rows if r['status']=='active']
counts={'total':len(rows),'status':dict(Counter(r['status'] for r in rows)),'answer_type_all_rows':dict(Counter(r['question_type'] for r in rows)),'active_difficulty':dict(Counter(r['difficulty'] for r in active)),'active_category':dict(Counter(r['category'] for r in active))}
assert counts['total']==238 and counts['status']=={'active':187,'pending':51}
assert len(counts['answer_type_all_rows'])==10
assert counts['active_difficulty']=={'basic':105,'intermediate':50,'advanced':32}
pom=ET.fromstring(read('pom.xml'));ns={'m':'http://maven.apache.org/POM/4.0.0'}
stack={'java_target':pom.findtext('m:properties/m:java.version',namespaces=ns),'spring_boot_parent':pom.findtext('m:parent/m:version',namespaces=ns),'packaging':pom.findtext('m:packaging',namespaces=ns)}
assert stack=={'java_target':'17','spring_boot_parent':'3.5.16','packaging':'war'}
assert 'jdbc:h2:file:./data/aptitest' in read('src/main/resources/application.properties')
assert 'app.payment-mode=${APP_PAYMENT_MODE:demo}' in read('src/main/resources/application.properties')
assert 'jdbc:mysql:' in read('src/main/resources/application-mysql.properties')
seed=read('src/main/java/com/aptitest/config/SeedDataLoader.java')
templates=[{'name':m[0],'difficulty':m[1],'questions':int(m[2]),'minutes':int(m[3]),'paid':m[4]=='true'} for m in re.findall(r'template\("([^"]+)",\s*"[^"]+",\s*"([^"]+)",\s*(\d+),\s*(\d+),\s*(true|false)\);',seed)]
assert len(templates)==5
g=read('src/test/java/com/aptitest/service/GradingServiceTest.java');i=read('src/test/java/com/aptitest/web/ApplicationIntegrationTest.java')
test_sources={'grading_parameter_inputs':len(re.findall(r'Arguments\.of\(',g)),'grading_signature_ordinary_tests':len(re.findall(r'@Test\b',g)),'integration_test_methods':len(re.findall(r'@Test\b',i)),'execution_for_this_report':False}
assert sum(test_sources[k] for k in ['grading_parameter_inputs','grading_signature_ordinary_tests','integration_test_methods'])==61
entities=[]
for path in sorted((SRC/'src/main/java/com/aptitest/domain').glob('*.java')):
    s=path.read_text();table=re.search(r'@Table\(name = "([^"]+)"',s)
    if table:entities.append({'entity':path.stem,'table':table[1],'foreign_key_names':re.findall(r'@ForeignKey\(name = "([^"]+)"',s)})
assert len(entities)==6
shots=[]
for path in sorted((SRC/'docs/screenshots').glob('*.png')):
    copied=ROOT/'assets/screenshots'/path.name
    assert sha(path)==sha(copied)
    shots.append({'path':'docs/screenshots/'+path.name,'sha256':sha(path),'pixels':list(Image.open(path).size)})
for name,src,box in [('dashboard-tests-crop.png','02-student-dashboard.png',(0,0,1440,1435)),('result-summary-crop.png','04-result.png',(0,0,1440,1150)),('mobile-viewport-crop.png','06-mobile-dashboard.png',(0,0,390,844))]:
    a=Image.open(ROOT/'assets/screenshots'/name).convert('RGB');b=Image.open(ROOT/'assets/screenshots'/src).crop(box).convert('RGB')
    assert ImageChops.difference(a,b).getbbox() is None
files=['pom.xml','src/main/resources/application.properties','src/main/resources/application-mysql.properties','src/main/resources/seed/questions.json','docs/TEST_REPORT.md','docs/SECURITY.md','docs/DEPLOYMENT.md']
files += [str(p.relative_to(SRC)) for p in sorted((SRC/'src/main/java').rglob('*.java'))]
evidence={'source_repository':'https://github.com/MKSubrahmanya12345/Aptitest-JSF','source_revision':REV,'audit_kind':'static inspection / independent seed recount / exact screenshot and crop comparisons','application_suites_rerun':False,'stack':stack,'question_counts':counts,'seed_templates':templates,'entities':entities,'test_source_inventory':test_sources,'documented_execution_only':{'java_cases_passed':61,'packaged_http_checks_passed':47,'source':'docs/TEST_REPORT.md','not_rerun_here':True},'screenshots':shots,'source_file_sha256':{p:sha(SRC/p) for p in files}}
(ROOT/'source_evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:evidence[k] for k in ['source_revision','stack','question_counts','test_source_inventory','application_suites_rerun']},indent=2))
print('Confirmed six unchanged source captures, three exact rectangular crops and five seeded templates.')
