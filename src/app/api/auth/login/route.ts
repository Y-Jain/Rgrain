import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { 
  comparePassword, 
  sanitizeInput, 
  checkRateLimit, 
  logAudit 
} from '@/lib/security';
import { createToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  // Use NextRequest.ip first (provided by hosting platform), fallback to parsing the first IP from x-forwarded-for
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = request.ip || (forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown');
  
  // Rate Limiting
  if (!checkRateLimit(ip, 5, 60000)) {
    return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const identifier = sanitizeInput(body.email || body.identifier);
    const password = body.password; // Don't sanitize password as it can contain special chars

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/Mobile and password are required' }, { status: 400 });
    }

    const user = await db('users')
      .where((builder) => {
        builder.whereRaw('LOWER(email) = LOWER(?)', [identifier])
               .orWhere('mobile', identifier);
      })
      .leftJoin('branches', 'users.branch_id', 'branches.id')
      .select('users.*', 'branches.name as branch_name')
      .first();

    if (!user) {
      console.log('User not found for identifier:', identifier);
      await logAudit('system', 'FAILED_LOGIN', `Failed login attempt for: ${identifier}`, 'medium');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Secure Password Comparison
    console.log('Comparing password for user:', user.email || user.mobile);
    const isPasswordValid = await comparePassword(password, user.password_hash);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
       console.log('Invalid password for user:', user.email || user.mobile);
       await logAudit(user.id, 'FAILED_LOGIN', 'Incorrect password entered', 'medium');
       return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.is_active) {
       return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    // Generate JWT
    const token = await createToken({
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      branchId: user.branch_id,
      permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || {}
    });

    // Omit password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        branchId: user.branch_id,
        branchName: user.branch_name,
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || {}
      }
    });

    // Set HTTP-only Cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    await logAudit(user.id, 'LOGIN', 'User logged in successfully', 'low');

    return response;
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
  }
}
