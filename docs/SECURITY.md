# Security and implementation boundaries

## Protections implemented

- **Roles enforced on the server.** Student signup always creates `STUDENT`, regardless of extra form parameters. Admin routes require `ADMIN`; practice/checkout routes require `STUDENT`.
- **Ownership checks.** Viewing, editing answers, submitting, and reattempting a test all check the authenticated account's ID. Admin result inspection uses separate admin-protected routes.
- **Password handling.** BCrypt cost 12; no plaintext storage/logging. Passwords require at least 8 characters and at most 72 UTF-8 bytes to avoid BCrypt's truncation boundary.
- **Token handling.** Cryptographically random 256-bit tokens; only SHA-256 hashes persist. Verification links last 24 hours, reset links 30 minutes. Tokens are consumed and user rows use optimistic versioning.
- **Session handling.** HttpOnly cookie; SameSite=Lax by default. MySQL deployment defaults to Secure cookies. Password changes/resets and account disable actions increment the credential version; the security filter revokes older sessions, including already signed-in users.
- **CSRF.** Enabled on every state-changing form and autosave endpoint. Logout is POST. Query/body parameters do not grant a session or role.
- **Output safety.** User/question text and option labels are escaped with JSTL. Passage, data block, and solution content are plain text, not executable HTML. No answer key is serialized into an active test page.
- **Persistence.** JPA parameter binding rather than SQL concatenation. Search wildcards and escape characters are treated literally. Relational foreign keys preserve ownership/snapshot references; composite uniqueness prevents duplicate positions within an attempt.
- **Test integrity.** Row locks serialize saves/submissions. Server time, not a browser counter, controls expiry. A late answer finalizes the old saved state instead of modifying it. Submission is idempotent, and reattempts do not count toward leaderboards.
- **Payment integrity.** Server-owned order, amount, and user/template association. Demo checkout is explicitly labelled and disabled outside demo mode. Razorpay requires valid HMAC and captured-payment details fetched server-side. No secret gateway key is rendered to the browser.
- **Safe errors.** Database exceptions/stack traces are not sent to users; JSON autosave failures return a small error object rather than entity serialization.
- **Defaults.** H2 console is not exposed. Spring Security's default security headers and frame denial remain on normal runs. Preview embedding is explicit and demo-only.

## Deliberate demo behavior

The README contains public demo credentials. Demo signup previews its verification link. The admin-only in-memory email outbox contains live demonstration reset/verification links. Demo checkout grants access without charging. These are deliberate educational features, not production authentication/email/payment configurations. Startup rejects those options when non-demo mode is selected.

## Before real deployment

1. Disable demo mode/seeding, use private credentials and HTTPS, and restrict direct access behind a trusted reverse proxy.
2. Configure SendGrid with a verified sender and Razorpay only if needed. Test delivery/capture and provider failure paths against test accounts.
3. Add login/registration/reset rate limiting at the reverse proxy or application layer, monitoring, audit logs, backups, and a recovery process.
4. Replace development schema updates with versioned migrations and restricted database permissions.
5. Use a real database and shared/distributed session storage before horizontal scaling. Analytics currently aggregate small educational datasets in Java and need database-side aggregation/caching for a large installation.
6. Add payment webhooks/reconciliation/refunds, stronger abuse prevention, and independent security review before accepting real money.
7. Keep dependencies current and review third-party licenses.

## Not claimed

No MFA, CAPTCHA, proctoring, plagiarism detection, secure browser/anti-cheating mechanism, formal accessibility audit, production load test, payment refund automation, mail-delivery guarantee, or bulk real-account migration is included. The app is a tested educational practice platform, not a certification/proctored examination system.
