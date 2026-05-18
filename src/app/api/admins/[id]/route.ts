import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, sanitizeInput } from '@/lib/security';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, password, branch_id, is_active } = body;

    const updateData: any = {};
    if (name) updateData.name = sanitizeInput(name);
    if (email) updateData.email = sanitizeInput(email);
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }
    if (branch_id) updateData.branch_id = branch_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    const [updatedAdmin] = await db('users')
      .where({ id, role: 'admin' })
      .update(updateData)
      .returning('*');

    if (!updatedAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json(updatedAdmin);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db('users').where({ id, role: 'admin' }).del();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
