# AptiTest — Java Spring Boot, JSP and MySQL

An aptitude and technical practice platform for CSE and IT students, built with **Java 17, Spring Boot, JSP/JSTL, Spring Security, Spring Data JPA and MySQL**.

## Run in Eclipse

1. Install **JDK 17, 21 or 25** and **MySQL 8+**. Start the MySQL service.
2. Open `database/setup.sql` in MySQL Workbench and run it.
3. Copy `config/application-local.properties.example` to **`config/application-local.properties`**. Enter your MySQL username and password in the copied file:
   ```properties
   spring.datasource.username=root
   spring.datasource.password=YOUR_MYSQL_PASSWORD
   ```
   This private file is excluded from Git. Do not commit your database password.
4. Eclipse → **File → Import → Maven → Existing Maven Projects**. Select the folder containing the root `pom.xml` and click **Finish**.
5. Right-click `src/main/java/com/aptitest/AptiTestApplication.java` → **Run As → Java Application**.
6. Open **http://localhost:8080**.

The application creates its `at_*` tables in **`aptitest_java`** and loads the question bank on the first startup. Questions, accounts, answers, attempts and results are stored in MySQL and survive restarts. No Node, Bun, React build or separate Tomcat installation is required.

## Accounts and administrator

Anyone can register a student account at `/signup` and sign in immediately. No email verification or administrator approval is required. Public signup always creates a student, never an administrator. Normal startup creates no default accounts and works before an administrator exists.

To create your administrator, first register your own account, then run the following in MySQL Workbench, replacing the email with that account's email:

```sql
UPDATE aptitest_java.at_users
SET role = 'ADMIN', enabled = 1,
    credentials_version = credentials_version + 1, version = version + 1
WHERE email = 'your@email.com';
```

Sign out and sign in again using the same password. The administrator role persists in MySQL. See `database/promote-admin.sql`. Existing accounts are not deleted or demoted automatically.

## Build from a terminal

```bash
./mvnw clean verify
java -jar target/aptitest.war
```

Windows: use `.\mvnw.cmd clean verify`. Keep the `config` folder beside the directory from which you start Java, or configure `DB_URL`, `DB_USERNAME` and `DB_PASSWORD` as environment variables. Eclipse also supports these under **Run Configurations → Environment**. A `.env` file is not loaded automatically.

## Features

- Student/admin authentication, immediate student registration, profile management and session revocation.
- Timed tests, category filters, saved answers, resume, review flags, server-side expiry and automatic grading.
- Ten question types, result explanations, reattempts, solved-question bank, history, analytics and rankings.
- Administrator question creation, editing, review, JSON import, template management and student access control.
- **238 questions:** 187 active and 51 awaiting review; five test templates, including 30/60-question practice.
- Responsive JSP interface, light/dark themes and printable results.

## Payments

Online checkout is disabled until Razorpay credentials are configured. There is **no simulated-payment or free-unlock endpoint**. Four practice templates are free; the paid template requires a verified captured payment. Private payment secrets stay on the server.

## Documentation and submission

- [Project report and architecture](docs/PROJECT_REPORT.md)
- [MySQL setup and deployment](docs/DEPLOYMENT.md)
- [User guide](docs/USER_GUIDE.md)
- [Data migration](docs/MIGRATION.md)
- [Security](docs/SECURITY.md)
- [Verification](docs/TEST_REPORT.md)

Create a clean source archive:

```bash
python3 scripts/package_submission.py
```

Output: `target/aptitest-submission.zip`. It includes Java/JSP source, MySQL setup, configuration examples, tests, wrappers and documentation, without private credentials or the old JavaScript projects. H2 is a **test-only** dependency and is not the application database.
