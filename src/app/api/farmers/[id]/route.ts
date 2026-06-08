import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { encryptData, sanitizeInput } from '@/lib/security';
import { verifyToken } from '@/lib/auth-utils';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Basic RBAC for Admin/Superadmin
    const token = request.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    const name = sanitizeInput(body.name) || 'Unknown Customer';
    const mobile = body.mobile || `NA-${Date.now()}`;
    const village = sanitizeInput(body.village);
    const district = sanitizeInput(body.district);
    const state = sanitizeInput(body.state);
    const aadhaar_no = body.aadhaar_no;

    const [updatedFarmer] = await db('farmers')
      .where({ id })
      .update({
        name,
        mobile: encryptData(mobile),
        village,
        district,
        state,
        aadhaar_no: aadhaar_no ? encryptData(aadhaar_no) : null,
        updated_at: db.fn.now()
      })
      .returning('*');

    if (!updatedFarmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    return NextResponse.json(updatedFarmer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Basic RBAC for Admin/Superadmin
    const token = request.headers.get('cookie')?.split('auth-token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { id } = await params;

    const deleted = await db('farmers').where({ id }).delete();

    if (!deleted) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Foreign key constraint failure typically implies the farmer has slips
    if (error.code === '23503') {
       return NextResponse.json({ error: 'Cannot delete farmer with existing slip history' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
