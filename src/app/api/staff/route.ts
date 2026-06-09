import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, sanitizeInput, checkRateLimit } from '@/lib/security';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    // SECURITY FIX: Enforce Tenant Boundaries
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (payload.role !== 'superadmin' && branchId && payload.branchId !== branchId) {
      return NextResponse.json({ error: 'Forbidden: Cannot view staff of other branches' }, { status: 403 });
    }

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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`staff_post_${ip}`, 10, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    // SECURITY FIX: Enforce Superadmin RBAC for Staff Creation
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden: Only admins and superadmins can create staff accounts' }, { status: 403 });
    }

    const body = await request.json();
    const name = sanitizeInput(body.name);
    const email = body.email ? sanitizeInput(body.email) : null;
    const mobile = body.mobile ? sanitizeInput(body.mobile) : null;
    const { password, branch_id, role_template } = body;

    if (!email && !mobile) {
      return NextResponse.json({ error: 'Either email or mobile number must be provided' }, { status: 400 });
    }

    const password_hash = await hashPassword(password || 'default123');

    // Check email uniqueness
    if (email) {
      const existingEmail = await db('users').whereRaw('LOWER(email) = LOWER(?)', [email]).first();
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }
    }

    // Check mobile uniqueness
    if (mobile) {
      const existingMobile = await db('users').where({ mobile }).first();
      if (existingMobile) {
        return NextResponse.json({ error: 'Mobile number already registered' }, { status: 400 });
      }
    }

    const [newStaff] = await db('users').insert({
      name,
      email,
      mobile,
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

export async function PATCH(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`staff_patch_${ip}`, 10, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    // SECURITY FIX: Enforce Superadmin RBAC for Staff Modification
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden: Only admins and superadmins can modify staff accounts' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, mobile, password, role_template, is_active } = body;

    if (!id) throw new Error("Staff ID is required");

    const currentStaff = await db('users').where({ id, role: 'staff' }).first();
    if (!currentStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = sanitizeInput(name);
    if (email !== undefined) updateData.email = email ? sanitizeInput(email) : null;
    if (mobile !== undefined) updateData.mobile = mobile ? sanitizeInput(mobile) : null;
    
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }
    if (role_template) {
      updateData.permissions = JSON.stringify({ template: role_template });
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    const finalEmail = updateData.email !== undefined ? updateData.email : currentStaff.email;
    const finalMobile = updateData.mobile !== undefined ? updateData.mobile : currentStaff.mobile;

    if (!finalEmail && !finalMobile) {
      return NextResponse.json({ error: 'Either email or mobile number must be provided' }, { status: 400 });
    }

    // Check uniqueness if email is changing
    if (updateData.email && updateData.email !== currentStaff.email) {
      const existingEmail = await db('users').whereRaw('LOWER(email) = LOWER(?)', [updateData.email]).whereNot({ id }).first();
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }
    }

    // Check uniqueness if mobile is changing
    if (updateData.mobile && updateData.mobile !== currentStaff.mobile) {
      const existingMobile = await db('users').where({ mobile: updateData.mobile }).whereNot({ id }).first();
      if (existingMobile) {
        return NextResponse.json({ error: 'Mobile number already registered' }, { status: 400 });
      }
    }

    const [updatedStaff] = await db('users')
      .where({ id, role: 'staff' })
      .update(updateData)
      .returning('*');

    return NextResponse.json(updatedStaff);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // SECURITY FIX: Enforce Superadmin RBAC for Staff Deletion
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden: Only admins and superadmins can delete staff accounts' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) throw new Error("Staff ID is required");

    await db('users').where({ id, role: 'staff' }).del();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
