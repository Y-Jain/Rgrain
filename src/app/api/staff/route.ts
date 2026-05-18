import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, sanitizeInput } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    let query = db('users').where('role', 'staff');
    if (branchId) {
      query = query.where('branch_id', branchId);
    }

    const staff = await query.orderBy('created_at', 'desc');
    return NextResponse.json(staff);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = sanitizeInput(body.name);
    const email = sanitizeInput(body.email);
    const { password, branch_id, role_template } = body;

    const password_hash = await hashPassword(password || 'default123');

    const [newStaff] = await db('users').insert({
      name,
      email,
      password_hash,
      role: 'staff',
      branch_id,
      permissions: JSON.stringify({ template: role_template }),
      is_active: true
    }).returning('*');

    return NextResponse.json(newStaff);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, password, role_template, is_active } = body;

    if (!id) throw new Error("Staff ID is required");

    const updateData: any = {};
    if (name) updateData.name = sanitizeInput(name);
    if (email) updateData.email = sanitizeInput(email);
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }
    if (role_template) {
      updateData.permissions = JSON.stringify({ template: role_template });
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    const [updatedStaff] = await db('users')
      .where({ id, role: 'staff' })
      .update(updateData)
      .returning('*');

    return NextResponse.json(updatedStaff);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) throw new Error("Staff ID is required");

    await db('users').where({ id, role: 'staff' }).del();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
