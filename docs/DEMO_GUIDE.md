# Demonstration and hand-in guide

## Prepare (before your evaluation)

1. Install/select JDK 17 or 21. Run `./mvnw clean verify` while internet is available so dependencies are cached.
2. Run `java -jar target/aptitest.war` and confirm `/api/health` is healthy.
3. Open `http://localhost:8080`. Keep this guide and the project report available.
4. Do **not** use actual card details; the default checkout is a no-charge demonstration.

## Suggested 8–10 minute presentation

### 1. Explain the migration (one minute)

“Originally AptiTest used React and an Express/Bun API. This submission uses Java, Spring Boot, Spring MVC, JSP/JSTL, Spring Security, and JPA in one executable WAR. The embedded H2 database makes the demonstration self-contained; a MySQL profile is also supplied.”

Show `pom.xml`, `AptiTestApplication.java`, one controller, one service, a repository, and a JSP to explain separation of responsibilities.

### 2. Student flow (three minutes)

Sign in as **student@aptitest.com / Student@12345**.

- Show practice templates, the question-count/time/difficulty options, and topic analytics.
- Start **Quick Warm-up**. Expand practice options and allow previously viewed questions if your pool has been used in earlier demonstrations.
- Enter an answer. Wait for **All changes saved**; refresh to demonstrate persistence.
- Navigate between questions, mark one for review, and explain the server-enforced timer.
- Submit the test. Show score, correct/wrong/skipped totals, solutions, and printable review.
- Show history, solved questions, topic breakdown, and rankings.
- Reattempt the test and explain that revision does not inflate statistics. An active revision can be submitted early to return to the dashboard.

### 3. Admin flow (three minutes)

Sign out using the sidebar button. Sign in as **admin@aptitest.com / Admin@12345**.

- Dashboard: pending/live questions, students, category coverage, and real activity trend.
- Question bank: filter/search; edit a flagged imported MCQ and point out its missing options.
- Create a simple valid numeric question (answer `{"value":4}` for “What is 2+2?”) or upload the example JSON. Approve it.
- Create a free **1-question, 1-minute** template constrained to its category. Explain validation when a template asks for more matching questions than exist.
- Open a student's stats and completed result; demonstrate disable/enable if desired (use a disposable student account).
- Explain that templates are archived instead of deleting result/payment history.

### 4. Recovery and paid access (one minute)

- On the public signup screen, register a disposable student. In demo mode, use the verification preview link to activate it.
- Request password recovery; as admin, open **Demo email outbox**. Explain that only the token hash is stored in the database and that links expire/are single-use.
- As student, unlock Hard Practice - 60 Qs through **Grant demo access — no charge**. This does not contact a payment provider.

### 5. Testing and conclusion (one minute)

Show [TEST_REPORT.md](TEST_REPORT.md), the unit/integration tests, and `scripts/smoke_test.py`. Explain role restrictions, CSRF, ownership, immutable question snapshots, idempotent grading, and late-answer protection.

Finish by describing realistic next steps: real-provider configuration, controlled migration of the hosted database, payment reconciliation, and production rate limiting/monitoring.

## Acceptance checklist

- [ ] Fresh startup seeds both accounts, five templates, and 238 questions without manual SQL.
- [ ] Restart preserves a changed profile and a completed result without duplicating seed data.
- [ ] Student login goes to `/dashboard`; admin login to `/admin`.
- [ ] A student cannot access an admin route or another student's test/result.
- [ ] A forged POST without CSRF is rejected.
- [ ] Answers survive refresh; clearing and marking for review work.
- [ ] Correct answers/solutions are hidden during an active session.
- [ ] Expired sessions submit server-side and late edits are refused.
- [ ] Result totals sum to the test question count; repeated submit does not change a score.
- [ ] Reattempts preserve question snapshots but are excluded from statistics/rankings.
- [ ] Admin question create/edit/review/import and template create/edit/archive work.
- [ ] Invalid JSON/import rows are rejected atomically.
- [ ] Search supports ordinary text and literal `%`, `_`, and backslashes.
- [ ] Disabling a student revokes an existing signed-in session.
- [ ] Registration verifies; reset tokens expire and cannot be reused.
- [ ] Demo checkout is visibly no-charge and cannot credit a different student/order.
- [ ] Theme persists; mobile menu and narrow layouts work.

## What to submit

```bash
python3 scripts/package_submission.py
```

Hand in `target/aptitest-submission.zip` (source, JSPs, build wrapper, docs, data, and tests), plus `target/aptitest.war` if a runnable binary is requested. There is no need to include `node_modules`, `.git`, `.local`, the local database, API keys, or a Java installation. Rebuild the archive after changing source/docs.
