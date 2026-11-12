# Data and application migration

The runnable application uses Spring MVC controllers, Java services, JPA repositories and JSP views instead of the old React/Express runtime. The original JavaScript folders remain for reference but are not part of the clean submission archive.

## Database

MySQL is the default application database. The Java tables are `at_users`, `at_questions`, `at_templates`, `at_attempts`, `at_attempt_questions` and `at_payments`. A separate `aptitest_java` database is recommended to avoid altering the earlier application's data.

The repository does not contain a full export of the previously hosted database. Real accounts, histories and payments are not automatically copied. Any such migration requires an authorized export, backups and ID mapping.

## Included questions

`database/questions-source.json` retains the original 100 reviewed question records and their answers. The seed generator preserves 49 approved entries and leaves 51 flagged entries pending; 138 curriculum exercises provide additional coverage. Source references identify imported and additional entries.

Regenerate the seed with:

```bash
python3 scripts/generate_seed.py
```

The resulting bank has 238 questions, 187 active and 51 pending. Five templates provide short, 30-question and 60-question practice sessions.

## Additional question imports

Sign in as administrator and upload a UTF-8 JSON array through Question bank. The import accepts up to 500 rows / 2 MB. Use the example at `src/main/resources/static/examples/questions.json`.

All imported rows require review. Invalid rows roll back the entire upload. Keep the original question IDs in an external mapping if migrating related records. Never grant a payment entitlement solely from a browser callback or an unverified historic status.

## Existing Java account tables

No account deletion or table reset is required. Account-email and password-recovery features have been removed. Authentication checks the password, role and enabled status only. The old NOT NULL `email_verified` column is still written with a compatibility value on new inserts, but is never read as an authentication gate. Old nullable token columns may remain unused in existing databases; no token fields or endpoints exist in the application.
