// Email service using MailerSend API (HTTP-based, works on Render)
// Sign up at https://mailersend.com, get API key, verify your domain

const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
const MAILERSEND_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL || 'noreply@yourdomain.com';
const MAILERSEND_FROM_NAME = process.env.MAILERSEND_FROM_NAME || 'AptiTest';

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email via MailerSend HTTP API
const sendViaMailerSend = async (config: EmailConfig): Promise<void> => {
  console.log('[EmailService] Attempting to send email via MailerSend...');
  console.log('[EmailService] MAILERSEND_API_KEY exists:', !!MAILERSEND_API_KEY);
  console.log('[EmailService] MAILERSEND_FROM_EMAIL:', MAILERSEND_FROM_EMAIL);
  console.log('[EmailService] To:', config.to);
  console.log('[EmailService] Subject:', config.subject);

  if (!MAILERSEND_API_KEY) {
    console.error('[EmailService] MAILERSEND_API_KEY not configured!');
    throw new Error('MAILERSEND_API_KEY not configured');
  }

  const payload = {
    from: {
      email: MAILERSEND_FROM_EMAIL,
      name: MAILERSEND_FROM_NAME,
    },
    to: [
      {
        email: config.to,
      },
    ],
    subject: config.subject,
    html: config.html,
    text: config.text,
  };

  console.log('[EmailService] Request payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[EmailService] Response status:', response.status);
    console.log('[EmailService] Response statusText:', response.statusText);

    // MailerSend returns 202 Accepted on success
    if (response.status !== 202 && !response.ok) {
      const errorText = await response.text();
      console.error('[EmailService] MailerSend API error response:', errorText);
      throw new Error(`MailerSend API error: ${response.status} - ${errorText}`);
    }

    // 202 means accepted - email is queued
    if (response.status === 202) {
      console.log('[EmailService] Email accepted by MailerSend (queued for delivery)');
    }

    // Try to parse response body (may be empty)
    const responseText = await response.text();
    console.log('[EmailService] Response body:', responseText || '(empty)');

  } catch (err: any) {
    console.error('[EmailService] Exception during send:', err.message);
    throw err;
  }
};

// Base email template
const getEmailTemplate = (content: string, title: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .content {
          padding: 30px 20px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .warning {
          background-color: #fffbeb;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
          font-size: 14px;
        }
        .code {
          background-color: #f1f5f9;
          padding: 12px 16px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 18px;
          letter-spacing: 2px;
          text-align: center;
          margin: 20px 0;
          color: #1e293b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 AptiTest</h1>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>This is an automated email from AptiTest. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} AptiTest. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const emailService = {
  // Send password reset email
  async sendPasswordResetEmail(email: string, resetToken: string, name: string): Promise<void> {
    console.log('Sending password reset email to:', email);

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const content = `
      <h2>Hello ${name || 'there'},</h2>
      <p>You recently requested to reset your password for your AptiTest account. Click the button below to reset it:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6366f1;">${resetUrl}</p>
      <div class="warning">
        <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
        If you did not request a password reset, please ignore this email or contact support if you have concerns.
      </div>
    `;

    const mailOptions: EmailConfig = {
      to: email,
      subject: '🔐 Password Reset Request - AptiTest',
      html: getEmailTemplate(content, 'Password Reset'),
      text: `Hello ${name || 'there'},\n\nYou requested to reset your password. Visit this link: ${resetUrl}\n\nThis link expires in 1 hour.`,
    };

    if (!MAILERSEND_API_KEY) {
      console.error('MAILERSEND_API_KEY not configured. Cannot send email.');
      console.log('Password reset token for', email, ':', resetToken);
      console.log('Reset URL:', resetUrl);
      return;
    }

    try {
      await sendViaMailerSend(mailOptions);
      console.log('Password reset email sent successfully via MailerSend');
    } catch (err: any) {
      console.error('Failed to send password reset email:', err.message);
      // Log token so admin can manually provide it
      console.log('Password reset token for', email, ':', resetToken);
      throw err;
    }
  },

  // Send email verification email
  async sendVerificationEmail(email: string, verificationToken: string, name: string): Promise<void> {
    console.log('[EmailService] sendVerificationEmail called for:', email);
    console.log('[EmailService] MAILERSEND_API_KEY exists:', !!MAILERSEND_API_KEY);

    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    console.log('[EmailService] Verify URL:', verifyUrl);

    const content = `
      <h2>Welcome to AptiTest, ${name || 'there'}! 👋</h2>
      <p>Thanks for signing up! Please verify your email address to complete your registration and start taking aptitude tests.</p>
      <p style="text-align: center;">
        <a href="${verifyUrl}" class="button">Verify Email Address</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6366f1;">${verifyUrl}</p>
      <div class="warning">
        <strong>⏰ Note:</strong> This verification link will expire in 24 hours.
        If you didn't create an account with AptiTest, please ignore this email.
      </div>
    `;

    const mailOptions: EmailConfig = {
      to: email,
      subject: '✅ Verify Your Email - AptiTest',
      html: getEmailTemplate(content, 'Email Verification'),
      text: `Welcome to AptiTest, ${name || 'there'}!\n\nPlease verify your email by visiting: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    };

    if (!MAILERSEND_API_KEY) {
      console.error('MAILERSEND_API_KEY not configured. Cannot send email.');
      console.log('Email verification token for', email, ':', verificationToken);
      console.log('Verify URL:', verifyUrl);
      return;
    }

    try {
      await sendViaMailerSend(mailOptions);
      console.log('Verification email sent successfully via MailerSend');
    } catch (err: any) {
      console.error('Failed to send verification email:', err.message);
      throw err;
    }
  },

  // Send welcome email after verification
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const content = `
      <h2>Welcome aboard, ${name || 'there'}! 🎉</h2>
      <p>Your email has been successfully verified and your AptiTest account is now active!</p>
      <p>Here's what you can do now:</p>
      <ul>
        <li>📝 Take practice tests to sharpen your skills</li>
        <li>🏆 Compete on the global leaderboard</li>
        <li>📊 Track your progress with detailed analytics</li>
        <li>🎯 Improve in specific categories</li>
      </ul>
      <p style="text-align: center;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="button">Start Testing</a>
      </p>
      <p>Good luck with your preparation!</p>
    `;

    const mailOptions: EmailConfig = {
      to: email,
      subject: '🎉 Welcome to AptiTest!',
      html: getEmailTemplate(content, 'Welcome'),
      text: `Welcome to AptiTest, ${name || 'there'}! Your account is now verified. Visit ${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard to start testing.`,
    };

    if (!MAILERSEND_API_KEY) {
      console.log('MAILERSEND_API_KEY not configured. Welcome email would be sent to:', email);
      return;
    }

    try {
      await sendViaMailerSend(mailOptions);
      console.log('Welcome email sent successfully via MailerSend');
    } catch (err: any) {
      console.error('Failed to send welcome email:', err.message);
    }
  },

  // Send password changed confirmation
  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const content = `
      <h2>Password Changed Successfully 🔒</h2>
      <p>Hello ${name || 'there'},</p>
      <p>Your AptiTest account password has been successfully changed.</p>
      <p>If you made this change, no further action is required.</p>
      <div class="warning">
        <strong>🚨 Didn't change your password?</strong><br>
        If you didn't make this change, please contact support immediately to secure your account.
      </div>
    `;

    const mailOptions: EmailConfig = {
      to: email,
      subject: '🔒 Password Changed - AptiTest',
      html: getEmailTemplate(content, 'Password Changed'),
      text: `Hello ${name || 'there'},\n\nYour AptiTest password has been changed. If you didn't make this change, please contact support.`,
    };

    if (!MAILERSEND_API_KEY) {
      console.log('MAILERSEND_API_KEY not configured. Password changed email would be sent to:', email);
      return;
    }

    try {
      await sendViaMailerSend(mailOptions);
      console.log('Password changed email sent successfully via MailerSend');
    } catch (err: any) {
      console.error('Failed to send password changed email:', err.message);
    }
  },
};
