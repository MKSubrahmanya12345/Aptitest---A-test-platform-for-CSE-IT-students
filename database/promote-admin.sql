-- Register your account at /signup, replace the email below, then execute.
-- Sign out and sign in again with your existing password.
UPDATE aptitest_java.at_users SET role = 'ADMIN', enabled = 1, credentials_version = credentials_version + 1, version = version + 1 WHERE email = 'your@email.com';
