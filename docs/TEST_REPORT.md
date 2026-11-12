# Verification

## Simplified accounts

Signup immediately creates an active student account. Password recovery, account-email/token endpoints, email delivery and the administrator outbox have been removed. Old account flags no longer block login or rankings. Tests now cover direct login, legacy-flag compatibility, removed endpoints, role tampering, password-change session revocation and duplicate signup. Normal startup creates no accounts; use the single statement in `database/promote-admin.sql` to assign your own registered account as administrator.

Source syntax, reference and archive checks are distinct from runtime verification. Java compilation, JUnit and a live MySQL login have not been run for this change in this environment. Historical verification below predates the simplification and is not a fresh pass.

## MySQL question-text correction

`Question.questionText` now explicitly uses `LONGTEXT NOT NULL` rather than a 20,000-character `VARCHAR`. This avoids the MySQL column-size error when the database uses `utf8mb4`, including when the connection and table character sets differ. Its existing string JDBC mapping is retained so case-insensitive question search remains supported.

New regression coverage:

- `MySqlSchemaTest` generates the actual Hibernate MySQL-dialect DDL without connecting to H2 or MySQL. Four cases check that the question column is `LONGTEXT NOT NULL` for connection character widths from one through four bytes, and that the question index and referencing foreign key are generated.
- `ApplicationIntegrationTest.longUnicodeQuestionTextCanBeReloadedSearchedAndSnapshotted` checks persistence, case-insensitive/literal-wildcard search and attempt snapshots for question text close to the 20,000-character form limit.

These five new cases and the existing suite have not been executed after this correction in the current environment: Maven and a MySQL server are unavailable. Source/packaging checks are not a substitute for a build or a fresh MySQL startup. Run the commands below in the configured local environment.

## Previous verification (before this correction)

- Java 17 compilation: passed for application and test sources.
- JUnit: **64 tests passed, 0 failed, 0 skipped** (34 grading cases and 30 integration cases).
- JavaScript and Python syntax checks: passed.
- Question seed regeneration: 238 records, 187 active and 51 pending.
- Clean source archive integrity: checked during packaging.

The regression tests cover MySQL as the default configuration, unconfigured checkout without creating an order or granting access, and registration without exposing an account token. Other cases cover grading, role separation, ownership, CSRF, expiry, snapshots, imports, search, account recovery, session revocation and database relationships.

Unit/integration tests use an isolated H2 database under the `test` profile. H2 is a test-only dependency; the application uses MySQL. A successful H2 run does not validate MySQL schema creation. MySQL connectivity and schema creation must be checked with the configured MySQL instance; that database connection and external providers were not exercised in the previous verification run.

## Re-run

```bash
./mvnw clean verify
```

For HTTP acceptance checks, start MySQL, configure the local database credentials, build the WAR and run:

```bash
python3 scripts/smoke_test.py --war target/aptitest.war
```

The utility uses a separate disposable `aptitest_acceptance` database, exercises the real JSP application, and removes its test tables afterward. Do not point it at a database containing student records. It requires permission to create the acceptance database, or the database must be created beforehand.

External email delivery and captured-payment calls require configured provider credentials. Live payment processing, production load testing, external Tomcat deployment and security auditing are not claimed by these tests.
