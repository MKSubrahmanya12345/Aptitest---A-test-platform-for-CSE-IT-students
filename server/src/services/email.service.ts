// Email service using SendGrid API (HTTP-based, works on Render)
// 100 emails/day free forever
// 1. Sign up at https://signup.sendgrid.com
// 2. Verify your sender email (Settings > Sender Authentication > Single Sender Verification)
// 3. Create API key (Settings > API Keys)

import sgMail from '@sendgrid/mail';

const getSendGridConfig = () => ({
  apiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.SENDGRID_FROM_EMAIL || 'your-verified@gmail.com',
  fromName: process.env.SENDGRID_FROM_NAME || 'AptiTest',
});

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Send email via SendGrid API
const sendViaSendGrid = async (config: EmailConfig): Promise<void> => {
  const { apiKey, fromEmail, fromName } = getSendGridConfig();

  console.log('[EmailService] Attempting to send email via SendGrid...');
  console.log('[EmailService] SENDGRID_API_KEY exists:', !!apiKey);
  console.log('[EmailService] SENDGRID_FROM_EMAIL:', fromEmail);
  console.log('[EmailService] To:', config.to);
  console.log('[EmailService] Subject:', config.subject);

  if (!apiKey) {
    console.error('[EmailService] SENDGRID_API_KEY not configured!');
    throw new Error('SENDGRID_API_KEY not configured');
  }

  // Set API key fresh each time (ensures it's set)
  sgMail.setApiKey(apiKey);

  const msg = {
    to: config.to,
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject: config.subject,
    html: config.html,
    text: config.text,
  };

  console.log('[EmailService] Request payload:', JSON.stringify(msg, null, 2));

  try {
    await sgMail.send(msg);
    console.log('[EmailService] Email sent successfully via SendGrid');
  } catch (err: any) {
    console.error('[EmailService] SendGrid API error:', err.response?.body || err.message);
    throw new Error(`SendGrid API error: ${err.response?.body?.errors?.[0]?.message || err.message}`);
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

    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

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

    if (!getSendGridConfig().apiKey) {
      console.error('SENDGRID_API_KEY not configured. Cannot send email.');
      console.log('Password reset token for', email, ':', resetToken);
      console.log('Reset URL:', resetUrl);
      return;
    }

    try {
      await sendViaSendGrid(mailOptions);
      console.log('Password reset email sent successfully via SendGrid');
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
    console.log('[EmailService] SENDGRID_API_KEY exists:', !!getSendGridConfig().apiKey);

    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
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

    if (!getSendGridConfig().apiKey) {
      console.error('SENDGRID_API_KEY not configured. Cannot send email.');
      console.log('Email verification token for', email, ':', verificationToken);
      console.log('Verify URL:', verifyUrl);
      return;
    }

    try {
      await sendViaSendGrid(mailOptions);
      console.log('Verification email sent successfully via SendGrid');
    } catch (err: any) {
      console.error('Failed to send verification email:', err.message);
      throw err;
    }
  },

  // Send welcome email after verification
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const baseUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
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
        <a href="${baseUrl}/dashboard" class="button">Start Testing</a>
      </p>
      <p>Good luck with your preparation!</p>
    `;

    const mailOptions: EmailConfig = {
      to: email,
      subject: '🎉 Welcome to AptiTest!',
      html: getEmailTemplate(content, 'Welcome'),
      text: `Welcome to AptiTest, ${name || 'there'}! Your account is now verified. Visit ${baseUrl}/dashboard to start testing.`,
    };

    if (!getSendGridConfig().apiKey) {
      console.log('SENDGRID_API_KEY not configured. Welcome email would be sent to:', email);
      return;
    }

    try {
      await sendViaSendGrid(mailOptions);
      console.log('Welcome email sent successfully via SendGrid');
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

    if (!getSendGridConfig().apiKey) {
      console.log('SENDGRID_API_KEY not configured. Password changed email would be sent to:', email);
      return;
    }

    try {
      await sendViaSendGrid(mailOptions);
      console.log('Password changed email sent successfully via SendGrid');
    } catch (err: any) {
      console.error('Failed to send password changed email:', err.message);
    }
  },
};
