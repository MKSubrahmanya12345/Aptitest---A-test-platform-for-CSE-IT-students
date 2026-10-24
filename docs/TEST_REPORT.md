# Verification report

**Application:** AptiTest Java/JSP 1.0.0

**Verification date:** 24 October 2026

## Executed verification

| Check | Result |
|---|---|
| Clean Maven compile, tests, and executable-WAR packaging | Passed |
| JUnit grading / signature tests | 34 passed |
| Spring Boot / persistence / security integration tests | 27 passed |
| Total Java automated cases | **61 passed, 0 failures, 0 errors, 0 skipped** |
| Packaged-WAR HTTP acceptance suite with real Tomcat/Jasper | **47 checks passed** |
| Chromium browser interaction / responsive checks | Passed, detailed below |
| JavaScript syntax (`node --check`) | Passed |
| Python utility syntax / source ZIP integrity | Passed |
| Source ZIP extracted; clean build and packaged HTTP suite re-run | 61 Java cases + 47 acceptance checks passed again |
| Generated project-report PDF | 8 pages; opens correctly, all sections and three diagrams present |

The Java test sources are `GradingServiceTest` and `ApplicationIntegrationTest`. Surefire writes machine-readable results under `target/surefire-reports/` when the build is run. The smoke utility starts an isolated in-memory database on port 18080, exercises the executable, and terminates it; it does not change the evaluator's persistent demo data.

## Java coverage

### Grading and payment signatures

Single-choice normalization; exact multi-choice sets; zero; commas, decimals, negative numbers and scientific notation; inclusive numeric tolerances; required units; textual data interpretation; equivalent/signed fractions and zero-denominator rejection; configurable decimal equivalents; exact/scaled and multi-term ratios; strict boolean parsing; short-text alternatives/case/punctuation/space rules; empty/null answers; invalid signatures, valid HMAC, and tampered order references.

### Application, persistence, and security

- Public health/readiness and authentication requirements.
- CSRF rejection and student/admin role isolation.
- Role-based login destinations and revocation after account disable.
- Attempt ownership, membership of question positions, immutable snapshots, and hidden ungraded correctness.
- Server-side expiry, late-answer refusal, idempotent submit/auto-submit, and repeated-start resume.
- Unseen-question filtering / explicit repeats and insufficient-pool atomicity.
- Reattempt snapshot reuse and exclusion from statistics.
- Template type/subcategory/category filters and checkbox binding for unchecked values.
- Paid-test start rejection until access is granted, demo order ownership, and repeat confirmation.
- Flagged MCQ validation before approval.
- Persistent hashed, expiring, single-use verification/reset tokens; credential version changes.
- BCrypt UTF-8 input boundaries.
- Backend form/JSON validation and atomic rollback of mixed-validity imports.
- Case-insensitive question search with literal `%`, `_`, and backslash characters.
- Database foreign keys preventing deletion of referenced questions.
- Sufficient easy/hard pools for both included 60-question templates.

The referential-integrity negative test intentionally triggers and catches an H2 foreign-key error; an expected SQL diagnostic in the test log is not a failing test.

## Packaged application acceptance

The suite performs real HTTP requests with cookie sessions and CSRF tokens. It verifies login and every principal JSP screen, admin question creation/search/approval/editing, template creation/editing, student test selection, autosave/refresh, submission/explanation rendering, revision, repeat submit, admin result inspection/student stats, solved bank/rankings, demo checkout, student signup/verification, role-tampering rejection, cross-student denial, profile update, password recovery/reset/reuse rejection, revocation of active sessions, account disable, and custom 404 handling.

This checks actual JSP compilation, not merely MockMvc view names. It also checks that the active test HTML does not contain the known correct-answer JSON or unique solution text.

## Browser verification

Chromium was used to interact with the running application at desktop **1440×1000** and mobile **390×844** sizes:

- Student/admin sign-in with secure preview session cookies.
- Correct UTF-8 currency/text display.
- A complete ten-question warm-up through the visible controls: six correct, two incorrect, and two skipped, with an asserted **60% score**.
- Autosave completion, live timer/navigator, normal next/finish behavior, and real result rendering.
- Dark-mode toggle, reload persistence, and restoring light mode.
- Mobile width check without horizontal overflow and working mobile navigation.
- Administrator overview and no uncaught JavaScript page errors.

Screenshots in `docs/screenshots/` were captured from the real application. They are not fabricated analytics or design mockups. This is functional/responsive verification, not a formal WCAG audit or a complete browser-compatibility certification.

## Verification environment and reproducibility

The sandbox had no preinstalled JDK/Maven and blocks direct Maven Central downloads. Local verification therefore used:

- Java **21.0.8** runtime, with compilation targeting Java **17** through the Eclipse compiler.
- Maven **3.9.12** and an offline dependency cache acquired from public GitHub-hosted Maven caches.
- Apache Tomcat/Jasper **10.1.55** built from the official Apache tag for the local cache, with ECJ 3.33.0 as its runtime compiler.
- The same root POM, standard Maven lifecycle, application source, tests, and WAR packaging used by the submitted project. No local tooling/cache is included in Git or the source ZIP.

The normal submission uses the standard Maven Wrapper (Maven 3.9.11) and a full JDK 17/21 with Maven Central access. A stock online JDK 17 build was not separately executed in this restricted host. The compiled application targets Java 17 bytecode and the packaged application was run and browser-tested on Java 21.

## Explicitly not verified here

- External MySQL connectivity and production schema rollout.
- SendGrid message delivery and live Razorpay order/capture calls with real provider credentials.
- Refund/webhook/reconciliation behavior (not implemented).
- External Tomcat deployment, production load, distributed sessions, formal penetration testing, and institutional submission rules.
- Remote GitHub Actions execution: workflow publication was rejected by the integration's missing `workflows` permission. The optional CI template is supplied as a documentation example, not an enabled workflow.

## Re-run on an ordinary development machine

```bash
./mvnw clean verify
python3 scripts/smoke_test.py --war target/aptitest.war
node --check src/main/resources/static/js/app.js   # optional; Node isn't an app requirement
python3 scripts/package_submission.py
```

Use your institution's approved Maven mirror if Central is blocked. Review [DEPLOYMENT.md](DEPLOYMENT.md) and repeat the checklist against any configured MySQL/gateway deployment before using real accounts or money.
