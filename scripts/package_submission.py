#!/usr/bin/env python3
"""Create and integrity-check a clean source hand-in (no credentials, DB, or tool caches)."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'target/aptitest-submission.zip'
PATHS = ['pom.xml', 'mvnw', 'mvnw.cmd', '.mvn', '.gitignore', '.env.example',
         'README.md', 'THIRD_PARTY_NOTICES.md', 'src', 'docs', 'scripts',
         'server/bedrock-report-1785356134001.json']
REQUIRED = PATHS + [
    '.mvn/wrapper/maven-wrapper.properties',
    'src/main/resources/seed/questions.json',
    *[f'docs/{name}.md' for name in (
        'PROJECT_REPORT', 'DEMO_GUIDE', 'DEPLOYMENT', 'MIGRATION', 'SECURITY', 'TEST_REPORT')],
]
missing = [name for name in REQUIRED if not (ROOT / name).exists()]
if missing:
    raise SystemExit('Missing required submission inputs: ' + ', '.join(missing))

OUTPUT.parent.mkdir(exist_ok=True)
with ZipFile(OUTPUT, 'w', ZIP_DEFLATED) as archive:
    for name in PATHS:
        path = ROOT / name
        files = [path] if path.is_file() else sorted(path.rglob('*'))
        for file in files:
            if file.is_file() and '__pycache__' not in file.parts and file.suffix != '.pyc':
                if file.name.startswith('.env') and file.name != '.env.example':
                    raise SystemExit('Refusing to include private environment file: ' + str(file))
                archive.write(file, 'aptitest/' + file.relative_to(ROOT).as_posix())
with ZipFile(OUTPUT) as archive:
    invalid = archive.testzip()
    if invalid:
        raise SystemExit('ZIP integrity failure: ' + invalid)
    count = len(archive.namelist())
print(f'Created {OUTPUT.relative_to(ROOT)} — {OUTPUT.stat().st_size:,} bytes, {count} files; integrity OK')
