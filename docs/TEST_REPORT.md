# Verification

## Current revision

- Java 17 compilation: passed for application and test sources.
- JUnit: **64 tests passed, 0 failed, 0 skipped** (34 grading cases and 30 integration cases).
- JavaScript and Python syntax checks: passed.
- Question seed regeneration: 238 records, 187 active and 51 pending.
- Clean source archive integrity: checked during packaging.

The regression tests cover MySQL as the default configuration, unconfigured checkout without creating an order or granting access, and registration without exposing an account token. Other cases cover grading, role separation, ownership, CSRF, expiry, snapshots, imports, search, account recovery, session revocation and database relationships.

Unit/integration tests use an isolated H2 database under the `test` profile. H2 is a test-only dependency; the application uses MySQL. The current revision's MySQL connectivity must be checked with the configured MySQL instance; the database connection and external providers were not exercised in this verification run.

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
