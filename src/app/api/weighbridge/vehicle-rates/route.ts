import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    let query = db('vehicle_rates').orderBy('vehicle_type', 'asc');
    if (branchId) {
      query = query.where('branch_id', branchId);
    }

    const rates = await query;
    return NextResponse.json(rates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { branchId, vehicleType, rate } = body;

    if (!branchId || !vehicleType) {
      return NextResponse.json({ error: 'Branch ID and Vehicle Type are required' }, { status: 400 });
    }

    const existing = await db('vehicle_rates')
      .where({ branch_id: branchId, vehicle_type: vehicleType })
      .first();

    if (existing) {
      const [updated] = await db('vehicle_rates')
        .where({ id: existing.id })
        .update({
          rate: parseFloat(rate) || 0,
          updated_at: db.fn.now()
        })
        .returning('*');
      return NextResponse.json(updated);
    } else {
      const [newRate] = await db('vehicle_rates').insert({
        branch_id: branchId,
        vehicle_type: vehicleType,
        rate: parseFloat(rate) || 0
      }).returning('*');
      return NextResponse.json(newRate);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
