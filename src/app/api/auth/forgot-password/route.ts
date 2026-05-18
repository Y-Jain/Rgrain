import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { sanitizeInput, logAudit } from '@/lib/security';
import { sendResetEmail } from '@/lib/mail';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const sanitizedEmail = sanitizeInput(email);

    if (!sanitizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await db('users').whereRaw('LOWER(email) = LOWER(?)', [sanitizedEmail]).first();

    // For security, always return success even if user doesn't exist to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: 'If an account exists with this email, you will receive reset instructions.' });
    }

    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store in DB
    await db('users').where({ id: user.id }).update({
      reset_token: resetToken,
      reset_token_expiry: expiry
    });

    // Send Email
    await sendResetEmail(user.email, resetToken);

    await logAudit(user.id, 'PASSWORD_RESET_REQUESTED', `Password reset token generated for ${user.email}`, 'medium');

    return NextResponse.json({ 
      success: true, 
      message: 'If an account exists with this email, you will receive reset instructions.' 
    });
  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
