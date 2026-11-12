-- 1. Start the application and register your account at /signup.
-- 2. Replace your@email.com below with your registered email, then execute.
-- 3. Sign out and sign in again using the same password.
-- No password is stored in this script and existing passwords are not changed.
UPDATE aptitest_java.at_users
SET role = 'ADMIN', enabled = 1, email_verified = 1,
    credentials_version = credentials_version + 1, version = version + 1
WHERE email = 'your@email.com';
