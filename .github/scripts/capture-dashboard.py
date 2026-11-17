"""Exercise real signup/login/test routes and capture the authenticated dashboard."""
from pathlib import Path
import json
import math
import secrets
import time
import urllib.error
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = 'http://127.0.0.1:8080'
end = time.monotonic() + 150
while True:
    try:
        with urllib.request.urlopen(BASE + '/api/health', timeout=3) as response:
            if response.status == 200:
                break
    except (urllib.error.URLError, TimeoutError):
        if time.monotonic() >= end:
            log = ROOT / 'target/dashboard-server.log'
            raise RuntimeError(log.read_text(errors='replace')[-20000:] if log.exists() else 'Startup timed out')
        time.sleep(0.5)

bank = json.loads((ROOT / 'src/main/resources/seed/questions.json').read_text())
questions = {q['question_text'].strip(): q for q in bank if q['status'] == 'active'}


def answer_for(question):
    correct = question['correct_answer']
    kind = question['question_type']
    if kind == 'mcq_multiple':
        return [str(v) for v in correct.get('values', [correct.get('value')])]
    if kind == 'fraction':
        return f"{correct['numerator']}/{correct['denominator']}"
    if kind == 'ratio':
        return ':'.join(str(v) for v in correct['values'])
    if kind == 'numeric_with_unit':
        return f"{correct['value']} {correct.get('unit', '')}".strip()
    if 'answers' in correct:
        return str(correct['answers'][0])
    value = correct.get('value', '')
    return str(value).lower() if isinstance(value, bool) else str(value)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport={'width': 1600, 'height': 1200}, device_scale_factor=2)
    page = context.new_page()
    page.set_default_timeout(30000)
    page.on('dialog', lambda dialog: dialog.accept())
    try:
        password = secrets.token_urlsafe(24)
        email = 'report.student@example.com'
        page.goto(BASE + '/signup', wait_until='networkidle')
        page.locator('#name').fill('Student')
        page.locator('#email').fill(email)
        page.locator('#password').fill(password)
        page.locator('#confirmPassword').fill(password)
        page.get_by_role('button', name='Create account').click()
        page.wait_for_url('**/login')
        page.locator('#email').fill(email)
        page.locator('#password').fill(password)
        page.get_by_role('button', name='Sign in', exact=False).click()
        page.wait_for_url('**/dashboard')
        expect(page.locator('h1')).to_contain_text('Welcome back, Student')
        print('Actual student signup and authenticated dashboard login passed.', flush=True)

        for correct_count in (8, 6):
            page.goto(BASE + '/dashboard', wait_until='networkidle')
            page.locator('.test-card').first.get_by_role('button', name='Start practice').click()
            page.wait_for_url('**/tests/*')
            for position in range(1, 11):
                expect(page.locator('input[name="position"]')).to_have_value(str(position))
                if position <= correct_count:
                    prompt = page.locator('.quiz-question').text_content().strip()
                    question = questions[prompt]
                    answer = answer_for(question)
                    if question['question_type'] == 'mcq_multiple':
                        for value in answer:
                            page.locator(f'input[name="answer"][value="{value}"]').check()
                    elif question['question_type'] in ('mcq_single', 'boolean'):
                        page.locator(f'input[name="answer"][value="{answer}"]').check()
                    else:
                        page.locator('#answer').fill(answer)
                if position < 10:
                    page.get_by_role('button', name='Save & next').click()
                else:
                    page.get_by_role('button', name='Save & finish test').click()
            page.wait_for_url('**/result')
            expect(page.locator('body')).to_contain_text(str(correct_count * 10) + '.0%')
            print(f'Completed actual ten-question practice with {correct_count} correct answers.', flush=True)

        page.goto(BASE + '/dashboard', wait_until='networkidle')
        expect(page.locator('h1')).to_contain_text('Welcome back, Student')
        expect(page.locator('.test-card')).to_have_count(5)
        page.evaluate('document.fonts.ready')
        card = page.locator('.test-card').nth(2).bounding_box()
        height = math.ceil(card['y'] + card['height'] + 12)
        page.set_viewport_size({'width': 1600, 'height': height})
        page.evaluate('document.fonts.ready')
        page.screenshot(path=str(ROOT / 'dashboard.png'), full_page=False, animations='disabled')
        print(f'Saved authentic dashboard.png: 3200 x {height * 2}; no DOM/text substitutions.', flush=True)
    except Exception:
        page.screenshot(path=str(ROOT / 'target/dashboard-capture-error.png'), full_page=True)
        raise
    finally:
        browser.close()
