# MySQL setup and deployment

## Local setup

Requirements: JDK 17/21 and MySQL 8+. Maven dependencies download during the first build.

1. Start MySQL.
2. Execute `database/setup.sql` in MySQL Workbench or the MySQL client. It creates `aptitest_java` using UTF-8.
3. Copy `config/application-local.properties.example` to `config/application-local.properties` and enter the MySQL account credentials. The application imports this local file automatically; it is excluded from Git and the submission ZIP.
4. Import the root `pom.xml` into Eclipse as an existing Maven project.
5. Run `com.aptitest.AptiTestApplication` as a Java application.
6. Open `http://localhost:8080`.

Alternatively:

```bash
./mvnw clean verify
java -jar target/aptitest.war
```

Use `.\mvnw.cmd` on Windows. Spring Boot includes Tomcat and compiles the JSP pages. Do not import the old `client` or `server` project to run this application.

## Connection settings

| Setting | Default / purpose |
|---|---|
| `DB_URL` | MySQL on localhost:3306, database `aptitest_java` |
| `DB_USERNAME` | `root`; use a dedicated database account for hosting |
| `DB_PASSWORD` | Your private MySQL password |
| `PORT` | `8080` |
| `APP_SEED_ENABLED` | `true`; load the initial question bank and templates |
| `APP_INITIAL_ACCOUNTS_ENABLED` | `true`; provision the initial administrator/student |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Provision a private administrator |
| `APP_BASE_URL` | External application URL for account links |

The local connection URL enables database creation and public-key retrieval and disables TLS for localhost. For a remote database, supply a URL with TLS and certificate verification. Restrict database access and use least-privilege credentials. The application uses separate `at_*` tables and does not overwrite the old application's tables.

## Schema and data

Hibernate creates/updates the six `at_*` tables, including foreign keys. The seed loader inserts 238 questions and five templates once per source reference. Editing questions or changing passwords is not undone by a restart.

For controlled production releases, use versioned database migrations and change `spring.jpa.hibernate.ddl-auto` to `validate` after provisioning. Back up the database before schema changes. Do not run acceptance checks against student data: the test utility uses the separate `aptitest_acceptance` database.

## Email

`APP_MAIL_MODE=outbox` keeps the latest 50 account messages in an administrator-only in-memory outbox. These messages are not emailed externally and disappear on restart. Verification/reset token hashes and expiry times persist in MySQL. Administrators should act on a requested account link before restarting, or request a new link afterward.

For external delivery, set `APP_MAIL_MODE=sendgrid`, `SENDGRID_API_KEY`, `APP_MAIL_FROM` and `APP_BASE_URL`. The sender must be verified with the provider. The application uses SendGrid's HTTPS endpoint, not SMTP. Anonymous pages never expose account tokens.

## Payments

Set `APP_PAYMENT_MODE=razorpay`, `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to enable checkout. The server verifies the order, signature, captured status, amount and INR currency before granting paid access. Without configuration the checkout page explains that online payments are unavailable; it does not create an order or grant access.

Refunds and webhook reconciliation are not implemented. Use provider test credentials before accepting payments. Configure automatic capture and HTTPS.

## Hosting

Run the executable WAR on Java 17+ or deploy it to Tomcat 10.1 / Jakarta Servlet 6. Tomcat 9 is not compatible. Use HTTPS, secure HttpOnly cookies, private initial credentials, restricted database access and backups. Disable initial account provisioning for real users. `GET /api/health` returns success only after initialization and a database check.

## Common problems

- **Access denied for user:** correct the username/password in `config/application-local.properties`.
- **Communications link failure:** start MySQL; check host and port in `DB_URL`.
- **Unknown database:** execute `database/setup.sql`, or grant permission to create the database.
- **Column length too big for `question_text`:** update `src/main/java/com/aptitest/domain/Question.java` from the corrected source. Its column annotation must be `@Column(nullable = false, columnDefinition = "LONGTEXT")`, not `length = 20000`. Stop the application, clean the Eclipse project and restart it. Keep your database and local credentials; with `ddl-auto=update`, Hibernate retries creating the missing table and its relationships. Do not drop the database or manually create the missing table to work around the mapping error.
- **Eclipse dependency errors:** right-click the project → Maven → Update Project; select a full JDK.
- **Port 8080 occupied:** use `--server.port=9090` in Run Configurations → Program arguments.
