# Migration from the React / Bun / Express application

## Scope and preservation

The Java application replaces the runnable frontend/backend with a single Spring MVC application. The original `client/`, `server/`, SQL scripts, presentation files, and project notes remain in the repository unchanged. Do not run the old servers alongside the Java app to evaluate this version.

This is a functional migration, not an automatic conversion of JSX to JSP and not an API-compatible drop-in for the old React client. JSPs render models on the server; HTML forms and a small vanilla-JS enhancement layer replace the React router and client service modules.

| Previous implementation | Java replacement |
|---|---|
| Express routes/controllers | `web/*Controller.java` |
| TypeScript services / mysql2 queries | Java services + Spring Data JPA repositories |
| JWT and localStorage credentials | Spring Security, BCrypt, server-side sessions, CSRF |
| React JSX / browser routing | Protected JSP views under `WEB-INF/views` |
| React layout/theme contexts | JSP layout tags, CSS variables, localStorage theme preference only |
| Client timers + periodic Bun interval | Server expiry checks, transactional grading, scheduled safety net |
| Separate pending and approved tables | `at_questions` with controlled publication status |
| Mutable questions joined into old results | Immutable per-attempt question/answer/solution snapshots |
| Stripe/Razorpay UI | No-charge demo checkout, plus optional server-verified Razorpay |
| SendGrid/other email SDKs | Optional SendGrid REST adapter; private demo outbox by default |

## Available repository data

The repository contains schema/seed scripts and Bedrock processing reports, **not the hosted MySQL database or a full SQL dump**. No credentials were requested and no remote database was accessed. Existing real users, balances, provider payments, and past test histories have **not** been invented or copied.

The seed bank is reproducible with `python3 scripts/generate_seed.py`:

- Latest report: `server/bedrock-report-1785356134001.json`.
- 49 report entries marked approved become active, with `legacy-report-<original id>` provenance.
- 51 flagged entries remain pending. Their original answers are retained rather than trusting an AI-converted MCQ letter with no options. Approval requires human correction and normal validation.
- 138 supplemental demo questions supply runnable question pools and technical/type coverage.
- Total: **238 questions, 187 active / 51 pending**. Of the active questions, 105 are basic, 50 intermediate, and 32 advanced.
- Original four 30/60-question easy/hard templates are retained, plus a 10-question mixed warm-up. The paid hard-60 template retains the ₹50 price.

Seed source references are checked before insert. Restarting does not overwrite edited questions or passwords. A reset uses a new/stopped disposable database, not destructive startup logic.

## New database model

All Java tables start with `at_`: `at_users`, `at_questions`, `at_templates`, `at_attempts`, `at_attempt_questions`, and `at_payments`. This avoids overwriting legacy tables even if a developer points at the same database; a **separate database and backup are still strongly recommended**.

IDs are generated independently. Source IDs are provenance, not Java primary keys. Questions no longer need to be moved from one table to another to approve them. Answer/time/result data share a snapshot row per question per attempt. Reattempts refer to their original attempt, and templates are archived rather than deleted.

## Bringing additional question data across

1. Back up the original database and export question rows to a UTF-8 JSON array using your normal database tooling.
2. Use the original field names (`category`, `subcategory`, `difficulty`, `question_type`, `question_text`, `passage`, `data_block`, `options`, `correct_answer`, `grading_config`, `solution`).
3. Sign in as admin → **Question bank** → **Import questions**.
4. Upload at most 500 rows / 2 MB per file.
5. Correct malformed rows and retry if validation fails. The import is atomic: one invalid row rolls back the entire file.
6. Review and approve the imported rows. All imports are pending regardless of a supplied status; the importer cannot silently publish arbitrary content.

Example: [downloadable import file](../src/main/resources/static/examples/questions.json).

JSON values may be objects/arrays, or JSON strings as produced by a MySQL export. Difficulty must be `basic`, `intermediate`, or `advanced`; question type must be one of the ten supported types. Non-MCQ options can be `{}`. MCQs need 2–12 non-empty labelled options and correct values matching those labels. Ratios support two or more terms. See the in-app editor for answer/config examples.

The administrative import intentionally inserts new rows, does not overwrite existing IDs, and does not de-duplicate separate uploaded files. Review for duplicate content before repeated imports.

## Real users, templates, histories, and payments

A bulk user/history/payment migration is **not included or claimed** without the actual source dataset. Such a migration must be performed separately with a backup, ID mapping, referential integrity checks, and verification of every payment entitlement with the provider. Existing bcrypt hashes may be compatible, but should be validated against sample accounts before copying. Never convert a pending provider payment into succeeded access based solely on an old browser callback.

For a demonstration submission, the seeded accounts and templates work immediately. For a real deployment, create a private administrator, import/review question data, create templates, and require verified student signup.
