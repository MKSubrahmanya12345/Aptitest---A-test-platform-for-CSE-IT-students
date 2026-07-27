import nodemailer from 'nodemailer';

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter
const createTransporter = () => {
  // For development/testing, use a test account or SMTP
  // For production, configure with actual SMTP credentials
  
  // Check if we have SendGrid or other SMTP config
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // For development, use Gmail or create a test account
  // Note: For Gmail, you need to use an App Password
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  
  // Fallback: Ethereal Email for testing (creates a test account automatically)
  return null;
};

let transporter: nodemailer.Transporter | null = null;

const getTransporter = async (): Promise<nodemailer.Transporter | null> => {
  if (!transporter) {
    transporter = createTransporter();
    
    // If no SMTP config, create ethereal test account
    if (!transporter) {
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log('Ethereal test account created:', testAccount.web);
      } catch (err) {
        console.error('Failed to create email transporter:', err);
        return null;
      }
    }
  }
  return transporter;
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
    const transport = await getTransporter();
    if (!transport) {
      console.error('Email transporter not available');
      // Log the token for development purposes
      console.log('Password reset token for', email, ':', resetToken);
      return;
    }

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

    const info = await transport.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    
    // For Ethereal test accounts, log the preview URL
    if (info.ethereal) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  },

  // Send email verification email
  async sendVerificationEmail(email: string, verificationToken: string, name: string): Promise<void> {
    const transport = await getTransporter();
    if (!transport) {
      console.error('Email transporter not available');
      console.log('Email verification token for', email, ':', verificationToken);
      return;
    }

    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
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

    const info = await transport.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    
    if (info.ethereal) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  },

  // Send welcome email after verification
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const transport = await getTransporter();
    if (!transport) {
      console.log('Welcome email would be sent to:', email);
      return;
    }

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

    const info = await transport.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
  },

  // Send password changed confirmation
  async sendPasswordChangedEmail(email: string, name: string): Promise<void> {
    const transport = await getTransporter();
    if (!transport) {
      console.log('Password changed email would be sent to:', email);
      return;
    }

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

    const info = await transport.sendMail(mailOptions);
    console.log('Password changed email sent:', info.messageId);
  },
};
