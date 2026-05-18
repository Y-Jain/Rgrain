import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, logAudit } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    // Find user with valid token and not expired
    const user = await db('users')
      .where({ reset_token: token })
      .andWhere('reset_token_expiry', '>', new Date())
      .first();

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Update user and clear token
    await db('users').where({ id: user.id }).update({
      password_hash: newPasswordHash,
      reset_token: null,
      reset_token_expiry: null
    });

    await logAudit(user.id, 'PASSWORD_RESET_COMPLETED', `Password successfully reset for ${user.email}`, 'high');

    return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error: any) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
