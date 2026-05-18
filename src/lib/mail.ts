import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendResetEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Grain Portal" <noreply@grainportal.com>',
    to: email,
    subject: 'Password Reset Request - Grain Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ea580c;">Password Reset Request</h2>
        <p>You recently requested to reset your password for your Grain Portal account. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">&copy; 2024 Grain Portal Management System. All rights reserved.</p>
      </div>
    `,
  };

  try {
    if (process.env.SMTP_USER === 'your-email@gmail.com') {
      console.log('--- MOCK EMAIL SENT ---');
      console.log('To:', email);
      console.log('Reset URL:', resetUrl);
      console.log('-----------------------');
      return { success: true, mock: true };
    }
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email Send Error:', error);
    throw new Error('Failed to send reset email');
  }
};
