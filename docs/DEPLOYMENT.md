# Setup and deployment

## 1. Self-contained demonstration (recommended for evaluation)

Prerequisites: JDK 17 or 21, a browser, and internet access to Maven Central for the first build. There is no requirement to install Node, npm, Bun, or a database server.

```bash
./mvnw clean verify
java -jar target/aptitest.war
```

On Windows, replace `./mvnw` with `.\mvnw.cmd`. Visit `http://localhost:8080` and use the credentials in the root README. The executable contains embedded Tomcat, Jasper, and JSTL. A JDK is required to **build**; the already-built WAR can run on a compatible Java 17+ runtime.

- Different port: `java -jar target/aptitest.war --server.port=9090`
- IDE: import the root `pom.xml` as a Maven project, choose a Java 17/21 SDK, and run `AptiTestApplication`.
- Development: `./mvnw spring-boot:run`
- Health/readiness: `GET /api/health` returns 503 during bootstrap and 200 when seed initialization and the database are ready.
- Local data lives under `./data`, relative to the directory from which Java is started. Run from a consistent directory.
- Only one application process should open the same embedded H2 file at once. Use MySQL for multi-instance deployments.

## 2. Optional MySQL 8+ setup

Use a **new database**. Do not execute the old Node schema as a migration for the new application.

```sql
CREATE DATABASE aptitest_java CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Create a dedicated user using a password chosen privately, then grant the
-- privileges needed for this application's tables in aptitest_java only.
```

Set environment variables in your terminal, IDE, or deployment secret manager. `.env.example` documents them; Spring Boot does **not** automatically read a `.env` file.

Required on first non-demo start:

| Variable | Purpose |
|---|---|
| `SPRING_PROFILES_ACTIVE=mysql` | Activate the MySQL datasource/profile |
| `DB_URL` | JDBC URL, e.g. `jdbc:mysql://localhost:3306/aptitest_java?serverTimezone=UTC` |
| `DB_USERNAME`, `DB_PASSWORD` | Dedicated database account |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Create the first verified administrator; existing passwords are never overwritten |
| `APP_BASE_URL` | Actual external HTTPS origin, used in email links |
| `APP_DEMO_ENABLED=false` | Disable demo links, users, and checkout |
| `APP_SEED_ENABLED=false` | Do not publish demo credentials or sample data |
| `APP_MAIL_MODE=sendgrid` | Real email delivery adapter |
| `APP_MAIL_FROM`, `SENDGRID_API_KEY` | Verified sender and private API key |
| `APP_PAYMENT_MODE=disabled` | Free practice only, unless real payments are configured |

```bash
java -jar target/aptitest.war --spring.profiles.active=mysql
```

The MySQL profile defaults to no demo seeding, SendGrid mail, disabled checkout, and secure session cookies. It creates the new `at_*` tables through Hibernate. It will refuse to start without an administrator or if demo options are accidentally left on while demo mode is off.

For an **HTTP-only local MySQL demonstration**, explicitly use `COOKIE_SECURE=false`. If sample data is wanted, also explicitly enable `APP_DEMO_ENABLED=true`, `APP_SEED_ENABLED=true`, `APP_MAIL_MODE=demo`, and `APP_PAYMENT_MODE=demo`. Do not use this combination for real student accounts.

MySQL configuration is supplied, but this sandbox's acceptance tests use H2; run the verification checklist against your own MySQL instance before deployment. Configure JDBC TLS/certificate verification for a remote database. Hibernate `ddl-auto=update` is convenient for a student submission, not a substitute for controlled production migrations. After provisioning, adopt versioned migrations and `validate`, with suitable restricted database privileges.

## 3. Real email (optional)

The Java adapter uses SendGrid's HTTPS mail endpoint, with Java/Spring `RestClient`; no Node SDK is involved. Set:

```text
APP_MAIL_MODE=sendgrid
SENDGRID_API_KEY=<private value in your environment>
APP_MAIL_FROM=<sender verified in SendGrid>
APP_BASE_URL=https://your-real-domain
```

Registration sends a 24-hour verification link; password recovery sends a 30-minute reset link. Delivery acceptance does not guarantee arrival; check the provider's delivery events and spam folders. API failures roll back signup/reset-token changes and show a safe error. No plaintext password is emailed.

In demo mode, mail is kept in an in-memory administrator-only outbox (last 50 messages); it is lost on restart. The signup confirmation can preview only the just-created account's verification link. Anonymous password recovery never reveals the reset link. SMTP configuration is not required or used by this version.

## 4. Razorpay (optional)

Default demo checkout is deliberately no-charge. For the optional gateway:

```text
APP_PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=<public checkout key>
RAZORPAY_KEY_SECRET=<private server-side secret>
```

Configure automatic capture on the provider account. The server creates an INR order using the template's stored price, associates it with the signed-in student, verifies the callback HMAC in constant time, and fetches the payment to confirm the matching order, amount, currency, and `captured` status before granting access. A browser-supplied success flag is never trusted. The private secret never appears in a JSP.

Test with provider test credentials first. Live network calls were not executed in the sandbox. There is no webhook-based reconciliation, automatic refund handling, or subscription billing. If confirmation fails after a charge, contact the administrator with the payment reference rather than paying again. Stripe has not been carried into the Java version; keep historic payment records in the archived system.

## 5. Traditional Tomcat deployment

Build the WAR and deploy it to **Tomcat 10.1 / Jakarta Servlet 6** running Java 17+. Tomcat 9 (the old `javax.servlet` namespace) is not compatible. `SpringBootServletInitializer` is included; embedded Tomcat/Jasper are packaged as provided libraries for executable and external-container deployment. JSTL is bundled with the app.

Deploy as `ROOT.war` for `/`, or `aptitest.war` for `/aptitest`. JSP links use the actual context path; there is no hard-coded browser-facing localhost API URL. Set the database file directory/JDBC URL, administrator environment, and external base URL consistently for that context path.

## 6. Reverse proxy / hosted preview

The embedded server binds to `0.0.0.0` and honors forwarded headers. Only a trusted reverse proxy should be allowed to set these headers in a real deployment. Terminate TLS correctly and use secure, HttpOnly cookies.

Normal deployments retain Spring Security's frame-denial header. For the Arena demo preview only, the process is started with:

```text
--app.preview-embedding=true
--server.servlet.session.cookie.same-site=none
--server.servlet.session.cookie.secure=true
```

Embedding is honored only while demo mode is enabled and limited by `frame-ancestors` to the configured preview domains. SameSite=None requires HTTPS and secure cookies. Local HTTP evaluation should use the ordinary defaults instead.

## 7. Optional CI template

The connected GitHub app could not upload executable workflows because it lacks the `workflows` permission. Consequently no remote Actions run is claimed. A ready template is provided at `docs/ci/java-ci.yml.example`. An owner with workflow permissions can copy it to `.github/workflows/java-ci.yml`, adjust branch triggers, and enable Actions. It compiles/tests, runs the packaged-WAR smoke checks, and uploads the WAR, source ZIP, and reports.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `JAVA_HOME` / no compiler | Install a full JDK and select it for Maven/IDE, not a JRE |
| Maven download fails | Allow Maven Central or configure your institution's approved Maven mirror |
| Port already in use | Stop the old instance or set a different `--server.port` |
| H2 file locked | Stop the other Java process; do not delete a live database |
| 404 / JSP not found after repackaging | Use the WAR, not an executable JAR; build from the root POM |
| Login cookie not retained on local HTTP + MySQL profile | Set `COOKIE_SECURE=false` for local HTTP only |
| Not enough questions | Select more categories, allow previously viewed questions, publish more matching questions, or reduce the template count |
| Account won't sign in | Verify its email; check enabled status and correct role/password |
| Flagged MCQ cannot be approved | Add valid options and a matching correct-answer label first |
