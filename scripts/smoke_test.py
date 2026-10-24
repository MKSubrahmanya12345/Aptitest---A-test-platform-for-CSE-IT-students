#!/usr/bin/env python3
"""Black-box acceptance tests against the executable WAR, including real Jasper JSP compilation."""
import argparse
import http.cookiejar
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
checks = 0


def expect(condition, message):
    global checks
    if not condition:
        raise AssertionError(message)
    checks += 1
    print('PASS:', message, flush=True)


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.forms, self.links, self.inputs = [], [], []
        self.form = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'form':
            self.form = dict(action=attrs.get('action', ''), fields={})
            self.forms.append(self.form)
        if tag == 'input':
            self.inputs.append(attrs)
            if self.form is not None and attrs.get('name'):
                self.form['fields'][attrs['name']] = attrs.get('value', '')
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])

    def handle_endtag(self, tag):
        if tag == 'form':
            self.form = None

    def value(self, name):
        return next(x.get('value', '') for x in self.inputs if x.get('name') == name)


class Browser:
    def __init__(self, base):
        self.base = base.rstrip('/')
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf = None

    def request(self, path, data=None, csrf=True, expected=200):
        url = path if path.startswith('http') else self.base + path
        headers = {}
        if data is not None:
            data = dict(data)
            if csrf and self.csrf:
                data['_csrf'] = self.csrf
            data = urllib.parse.urlencode(data, doseq=True).encode()
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        request = urllib.request.Request(url, data=data, headers=headers)
        try:
            response = self.opener.open(request, timeout=25)
        except urllib.error.HTTPError as error:
            response = error
        text = response.read().decode('utf-8')
        status, final = response.status, response.geturl()
        if status != expected:
            raise AssertionError(f'{path}: expected HTTP {expected}, got {status}: {text[-1500:]}')
        page = Page(text)
        for field in page.inputs:
            if field.get('name') == '_csrf':
                self.csrf = field['value']
                break
        return text, page, final

    def login(self, email, password, destination):
        self.request('/login')
        text, page, url = self.request('/login', {'email': email, 'password': password})
        expect(urllib.parse.urlparse(url).path == destination, f'{email} signs in to {destination}')
        return text, page


def run(base):
    admin = Browser(base)
    text, _, _ = admin.request('/login')
    expect('Welcome back.' in text and 'Student@12345' in text, 'real login JSP renders and demo credentials are available')
    expect(admin.csrf is not None, 'login form contains a CSRF token')
    admin.request('/signup', {'name': 'forged'}, csrf=False, expected=403)
    expect(True, 'anonymous POST without CSRF is rejected')
    admin.login('admin@aptitest.com', 'Admin@12345', '/admin')
    for path, marker in [('/admin/manage-questions', 'Your question bank'), ('/admin/questions/new', 'Create a question'),
                         ('/admin/test-templates', 'Build the right kind of test'), ('/admin/test-templates/new', 'Create a test template'),
                         ('/admin/view-students', 'Your student community'), ('/admin/rankings', 'leaderboard'),
                         ('/admin/mail', 'Demo email outbox'), ('/profile', 'Personal details')]:
        text, _, _ = admin.request(path)
        expect(marker in text, path + ' compiles and renders')
    question = dict(category='Smoke Check', subcategory='Addition', difficulty='basic', questionType='numeric',
                    questionText='Smoke test: what is 2 + 2?', optionsJson='{}', correctAnswerJson='{"value":4}',
                    gradingConfigJson='{"tolerance":0}', solution='Smoke explanation: two pairs make four.', status='pending')
    text, page, _ = admin.request('/admin/questions', question)
    ids = [re.search(r'/admin/questions/(\d+)/edit', link).group(1) for link in page.links if re.search(r'/admin/questions/(\d+)/edit', link)]
    qid = max(map(int, ids))
    expect('Question saved.' in text, 'admin creates a pending question')
    search_text, _, _ = admin.request('/admin/manage-questions?status=pending&search=Smoke%20test')
    expect('Smoke test: what is 2 + 2?' in search_text, 'question search works on the persisted question text')
    admin.request(f'/admin/questions/{qid}/edit')
    text, _, _ = admin.request(f'/admin/questions/{qid}/review', {'decision': 'approve'})
    expect('Question approved.' in text, 'admin approves a valid question')
    test = dict(name='Smoke single-question test', description='Packaged WAR acceptance check', difficulty='basic', questionCount='1',
                durationMinutes='1', categoriesCsv='Smoke Check', priceRupees='0', active='true', allowReattempt='true')
    text, page, _ = admin.request('/admin/test-templates', test)
    tids = [int(re.search(r'/admin/test-templates/(\d+)/edit', link).group(1)) for link in page.links if re.search(r'/admin/test-templates/(\d+)/edit', link)]
    tid = max(tids)
    expect('Test template saved.' in text, 'admin creates a published test template')
    admin.request(f'/admin/test-templates/{tid}/edit')
    admin.request('/dashboard', expected=403)
    expect(True, 'admin cannot impersonate a student workspace')

    student = Browser(base)
    text, dashboard = student.login('student@aptitest.com', 'Student@12345', '/dashboard')
    expect('Quick Warm-up' in text and 'Hard Practice - 60 Qs' in text, 'student sees the migrated test templates')
    for path, marker in [('/history', 'Your practice history'), ('/solved', 'Your solved question bank'),
                         ('/rankings', 'leaderboard'), ('/profile', 'Change password')]:
        text, _, _ = student.request(path)
        expect(marker in text, path + ' compiles and renders')
    student.request('/admin', expected=403)
    expect(True, 'student cannot access admin pages')
    text, _, url = student.request('/tests/start', {'templateId': tid, 'includeSeen': 'true'})
    aid = int(re.search(r'/tests/(\d+)', url).group(1))
    expect('Smoke test: what is 2 + 2?' in text, 'published question is selected by the template filters')
    expect('Smoke explanation: two pairs make four.' not in text and '{"value":4}' not in text, 'active test does not expose solutions or correct-answer JSON')
    text, _, _ = student.request(f'/tests/{aid}/autosave', {'position': 1, 'answer': '4', 'flagged': 'true'})
    expect('"saved":true' in text, 'answer autosave works with CSRF protection')
    text, _, _ = student.request(f'/tests/{aid}')
    expect('value="4"' in text, 'saved answer survives a refresh')
    text, _, _ = student.request(f'/tests/{aid}/answer', {'position': 1, 'answer': '4', 'navigation': 'finish'})
    expect('100.0%' in text and 'Smoke explanation: two pairs make four.' in text, 'submission grades correctly and renders explanations')
    admin.request(f'/admin/attempts/{aid}')
    expect(True, 'admin can review a completed student result')
    text, _, _ = student.request('/solved')
    expect('Smoke test: what is 2 + 2?' in text, 'submitted answers appear in the solved bank')
    student.request('/rankings')
    text, _, url = student.request(f'/tests/{aid}/reattempt', {})
    retry = int(re.search(r'/tests/(\d+)', url).group(1))
    expect(retry != aid and 'Revision reattempt' in text, 'reattempt creates a distinct revision session')
    student.request(f'/tests/{retry}/submit', {})
    text, _, _ = student.request(f'/tests/{aid}/submit', {})
    expect('100.0%' in text, 'repeated submission leaves the original score unchanged')
    text, page, _ = admin.request('/admin/view-students')
    sid = int(next(re.search(r'/admin/view-students/(\d+)', link).group(1) for link in page.links if re.search(r'/admin/view-students/(\d+)', link)))
    text, _, _ = admin.request(f'/admin/view-students/{sid}')
    expect('Topic performance' in text, 'student statistics and history JSP renders')
    paid = next(link for link in dashboard.links if '/checkout/' in link)
    text, page, _ = student.request(paid)
    expect('No bank details are requested' in text, 'paid template uses clearly labelled demo checkout')
    order = page.value('orderId')
    text, _, _ = student.request(paid + '/demo', {'orderId': order})
    expect('No money was charged.' in text, 'demo payment grants access without a real charge')

    new = Browser(base)
    new.request('/signup')
    email = 'submission-smoke@example.com'
    text, page, _ = new.request('/signup', {'name': 'Smoke Student', 'email': email, 'password': 'Smoke@12345', 'confirmPassword': 'Smoke@12345', 'role': 'ADMIN'})
    verify = next(link for link in page.links if '/verify-email?token=' in link)
    new.request(verify)
    new.login(email, 'Smoke@12345', '/dashboard')
    new.request('/admin', expected=403)
    expect(True, 'registration cannot elevate its role through form tampering')
    new.request(f'/tests/{aid}/result', expected=403)
    expect(True, 'a different student cannot read another student’s result')
    text, _, _ = new.request('/profile', {'name': 'Updated Smoke Student'})
    expect('Profile updated.' in text, 'profile changes persist')
    anonymous = Browser(base)
    anonymous.request('/forgot-password')
    text, _, _ = anonymous.request('/forgot-password', {'email': email})
    expect('If a verified, active account exists' in text and '/reset-password?token=' not in text, 'password reset does not expose account existence or tokens')
    text, page, _ = admin.request('/admin/mail')
    reset = next(link for link in page.links if '/reset-password?token=' in link)
    text, page, _ = anonymous.request(reset)
    token = page.value('token')
    text, _, _ = anonymous.request('/reset-password', {'token': token, 'password': 'Changed@12345', 'confirmPassword': 'Changed@12345'})
    expect('Password reset successfully.' in text, 'password-reset JSP and token completion work')
    text, _, url = new.request('/dashboard')
    expect('/login' in url, 'password reset revokes an existing logged-in session')
    new.login(email, 'Changed@12345', '/dashboard')
    text, _, _ = anonymous.request('/reset-password', {'token': token, 'password': 'Another@12345', 'confirmPassword': 'Another@12345'})
    expect('Invalid or expired reset link.' in text, 'reset token cannot be reused')
    text, page, _ = admin.request('/admin/view-students?search=' + urllib.parse.quote(email))
    new_id = next(re.search(r'/admin/view-students/(\d+)', link).group(1) for link in page.links if re.search(r'/admin/view-students/(\d+)', link))
    admin.request(f'/admin/view-students/{new_id}/status', {'enabled': 'false'})
    _, _, url = new.request('/dashboard')
    expect('/login' in url, 'admin disable action revokes existing student sessions')
    student.request('/this-page-does-not-exist', expected=404)
    expect(True, 'unknown routes render the custom 404 JSP')
    print(f'\n{checks} packaged-application acceptance checks passed.', flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--war', type=Path)
    parser.add_argument('--base-url')
    args = parser.parse_args()
    process = None
    log = ROOT / 'target/smoke-server.log'
    stream = None
    try:
        if args.base_url:
            base = args.base_url
        elif args.war:
            log.parent.mkdir(exist_ok=True)
            stream = log.open('w')
            process = subprocess.Popen(['java', '-jar', str(args.war.resolve()), '--server.port=18080',
                                        '--spring.datasource.url=jdbc:h2:mem:smoke;DB_CLOSE_DELAY=-1',
                                        '--spring.jpa.hibernate.ddl-auto=create-drop', '--app.demo-enabled=true', '--app.seed-enabled=true',
                                        '--app.payment-mode=demo', '--app.mail-mode=demo'], cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT)
            base = 'http://127.0.0.1:18080'
            deadline = time.monotonic() + 100
            while True:
                if process.poll() is not None:
                    raise RuntimeError('Application exited before startup')
                try:
                    with urllib.request.urlopen(base + '/api/health', timeout=2) as response:
                        if response.status == 200:
                            break
                except (urllib.error.URLError, TimeoutError):
                    if time.monotonic() >= deadline:
                        raise RuntimeError('Application did not become healthy')
                    time.sleep(0.3)
        else:
            parser.error('Pass --war target/aptitest.war or --base-url http://...')
        run(base)
    except Exception:
        if log.exists():
            print('\n--- Application diagnostics ---\n' + log.read_text(errors='replace')[-22000:], file=sys.stderr)
        raise
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        if stream:
            stream.close()


if __name__ == '__main__':
    main()
