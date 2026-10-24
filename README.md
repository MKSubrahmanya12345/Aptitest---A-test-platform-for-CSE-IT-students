# AptiTest — Java Spring Boot + JSP

A submission-ready aptitude and technical practice platform for CSE and IT students. The runnable application is now **Java 17, Spring Boot 3.5, Spring MVC, JSP/JSTL, Spring Security, and Spring Data JPA**. No Node, Bun, React build, cloud account, or API key is required for the default demo.

## Quick start

Install **JDK 17 or 21** (not just a JRE). Maven is downloaded automatically by the included wrapper on first use; internet access to Maven Central is required for the initial build.

```bash
# macOS / Linux
./mvnw clean verify
java -jar target/aptitest.war
```

```powershell
# Windows PowerShell
.\mvnw.cmd clean verify
java -jar target\aptitest.war
```

Open **http://localhost:8080**. For development: `./mvnw spring-boot:run`.

| Demo role | Email | Password |
|---|---|---|
| Student | student@aptitest.com | Student@12345 |
| Admin | admin@aptitest.com | Admin@12345 |

The H2 database is created automatically in `data/` and survives restarts. Initial data is seeded once per source reference; restarts do not overwrite edits. To reset a **local demo**, stop the application and remove the `data/` directory. Never do this to a database you need to retain.

## Included features

- **Accounts:** verified student registration, sign in/out, profile updates, BCrypt passwords, expiring/single-use email and reset tokens, role-based authorization, and session revocation after bans or password changes.
- **Student:** configurable practice tests, category selection, unique random question selection, unseen-question filtering (optional repeat toggle), autosave, resume, question navigation, review flags, server-enforced timer, automatic submission, results/explanations, solved bank, history, reattempts, topic analytics, and four ranking views.
- **Admin:** dashboard/category coverage/activity trends, pending question approval/rejection, create/edit/deactivate questions, atomic JSON import, create/edit/archive test templates, student search/history/results, and enable/disable accounts.
- **Grading:** single/multiple MCQ, numeric, numeric with unit, data interpretation, fraction, ratio, boolean, fill-in-the-blank, and short text. Each test stores immutable question snapshots.
- **Paid templates:** clearly labelled **demo checkout** works without charging money. An optional Razorpay integration verifies signatures and captured payments server-side. Stripe is not used by the Java application.
- Responsive JSP interface, light/dark theme, accessible forms, empty/error states, and printable results. Assets are local; there are no CDN dependencies in the default demo.

## Data included

**238 questions: 187 active and 51 pending review**, plus five runnable templates. The latest original report contributes 49 approved questions and 51 flagged questions; 138 deterministic demo questions add coverage across aptitude, reasoning, CSE, programming, and verbal ability. Both the easy and hard pools support the original 60-question templates.

The repository contains schemas and question-processing reports, **not a full export of the old hosted database**. Existing remote users, passwords, payments, and histories have not been copied or fabricated. The original `client/` and `server/` remain untouched for reference; they are not required to run the Java project. See [migration notes](docs/MIGRATION.md).

## Verification

```bash
./mvnw clean verify                         # Java unit/integration/security tests
python3 scripts/smoke_test.py --war target/aptitest.war
python3 scripts/package_submission.py       # target/aptitest-submission.zip
```

The black-box smoke test starts an isolated in-memory demo on port 18080, exercises the packaged WAR, compiles JSPs through real Tomcat/Jasper, then stops the server. It does not touch `data/`. Python 3 is needed only for these optional packaging/smoke utilities, not for running the application.

**Verified:** 61 Java test cases and 47 packaged-application acceptance checks pass; the real browser flow, autosave, theme persistence, and mobile layout were also exercised. See [the verification report](docs/TEST_REPORT.md). An optional Actions workflow template is in `docs/ci/java-ci.yml.example`; it is not enabled by this migration because the connected GitHub app lacks workflow-upload permission.

## Project layout

```text
pom.xml, mvnw, mvnw.cmd           Maven build + wrapper
src/main/java/com/aptitest/
  config/                        security, principals, idempotent demo bootstrap
  domain/                        six JPA entities + roles
  repository/                    Spring Data repositories and row locking
  service/                       accounts, question bank, tests, grading, analytics, payments
  web/                           Spring MVC controllers and validated form objects
src/main/webapp/WEB-INF/
  views/                         JSP screens and reusable fragments
  tags/                          shared layout, CSRF, icon tags
src/main/resources/
  application*.properties        H2 / MySQL configuration
  seed/questions.json            versioned question data with provenance
  static/                        CSS, vanilla JS, example question import
src/test/                        automated Java tests
scripts/                         packaged-app acceptance checks and source packaging
docs/                            report, setup, architecture, migration, demonstration guide
```

## Submission and deployment

- [Project report and architecture](docs/PROJECT_REPORT.md)
- [Demonstration and acceptance checklist](docs/DEMO_GUIDE.md)
- [Executed verification report](docs/TEST_REPORT.md)
- [MySQL, email, Razorpay, and deployment](docs/DEPLOYMENT.md)
- [Migration and question import](docs/MIGRATION.md)
- [Security and limitations](docs/SECURITY.md)

**Hand in:** `target/aptitest-submission.zip` (source) and, if requested, `target/aptitest.war` (executable). The ZIP intentionally excludes Git history, the legacy Node projects, database files, secrets, dependencies, and build output. It retains the single original processing report needed to regenerate the question seed.

For a different port: `java -jar target/aptitest.war --server.port=9090`. WAR packaging is intentional: executable JARs do not support this JSP layout. The WAR can also be deployed to a compatible Jakarta Servlet 6 / Tomcat 10.1 container; see deployment notes.

> The default configuration is an educational demo. It publishes demo credentials, previews registration email links, and enables no-charge checkout. Disable demo mode and configure deployment settings before exposing real accounts or taking real payments.
