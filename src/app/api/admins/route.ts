import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, sanitizeInput } from '@/lib/security';

export async function GET() {
  try {
    const admins = await db('users')
      .where('role', 'admin')
      .leftJoin('branches', 'users.branch_id', 'branches.id')
      .select('users.*', 'branches.name as branch_name')
      .orderBy('users.created_at', 'desc');
    return NextResponse.json(admins);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = sanitizeInput(body.name);
    const email = sanitizeInput(body.email);
    const { password, branch_id } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);

    const [newAdmin] = await db('users').insert({
      name,
      email,
      password_hash,
      role: 'admin',
      branch_id,
      is_active: true
    }).returning('*');

    return NextResponse.json(newAdmin);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
