# Security

- Spring Security enforces administrator/student roles, ownership and CSRF protection.
- Passwords use BCrypt cost 12; input is limited to 72 UTF-8 bytes.
- Verification/reset tokens are random, stored as SHA-256 hashes, expiring and single-use.
- Password changes, password resets and account disabling invalidate older sessions.
- Public signup cannot request an administrator role and does not reveal verification tokens.
- Outbox account links are visible only to administrators. Configure external email delivery for independently verified email ownership.
- Question text and answers are escaped; active test pages do not expose solutions or answer keys.
- The server controls deadlines and scoring, locks concurrent changes, and makes submission idempotent.
- Attempt snapshots preserve the question and answer used for grading even if the bank is edited later.
- Payment access requires a valid signature and captured-payment verification. No simulated-payment endpoint exists.
- MySQL stores all application records. H2 is confined to isolated automated tests.
- Use private database credentials, HTTPS, secure cookies and backups for hosting. Initial passwords must be changed; initial account provisioning can be disabled.

The application does not implement proctoring, MFA, login rate limiting, payment refunds or webhook reconciliation. Add these controls and perform an independent security review before high-stakes or public production use.
