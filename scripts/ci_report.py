#!/usr/bin/env python3
"""Small GitHub check summary so compiler/test diagnostics are available through the API."""
import json
import os
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET

sections = []
for name in ['build-ci.log', 'smoke-ci.log']:
    path = Path(name)
    if path.exists():
        sections.append('### ' + name + '\n```text\n' + path.read_text(errors='replace')[-27000:].replace('```', "'''") + '\n```')
for path in Path('target/surefire-reports').glob('TEST-*.xml'):
    root = ET.parse(path).getroot()
    sections.append(f"{root.attrib['name']}: {root.attrib.get('tests')} tests, {root.attrib.get('failures')} failures, {root.attrib.get('errors')} errors")
summary = '\n\n'.join(sections)[-62000:]
status = os.environ.get('CI_JOB_STATUS', 'failure')
body = dict(name='Build diagnostics', head_sha=os.environ['GITHUB_SHA'], status='completed',
            conclusion='success' if status == 'success' else 'failure',
            output=dict(title='AptiTest Java verification: '+status, summary=summary or 'No build output.'))
url = 'https://api.github.com/repos/' + os.environ['GITHUB_REPOSITORY'] + '/check-runs'
request = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST',
                                headers={'Authorization': 'Bearer '+os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
with urllib.request.urlopen(request) as response:
    print('Published diagnostics:', json.load(response)['html_url'])
