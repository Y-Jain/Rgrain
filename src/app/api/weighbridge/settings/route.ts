import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });
    }

    let settings = await db('weighbridge_settings').where({ branch_id: branchId }).first();
    
    if (!settings) {
      // Create default settings if not exists
      const [newSettings] = await db('weighbridge_settings').insert({
        branch_id: branchId,
        starting_serial_number: 1,
        current_serial_number: 0
      }).returning('*');
      settings = newSettings;
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { branchId, startingSerialNumber } = body;

    if (!branchId) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });
    }

    const existing = await db('weighbridge_settings').where({ branch_id: branchId }).first();

    if (existing) {
      const [updated] = await db('weighbridge_settings')
        .where({ id: existing.id })
        .update({
          starting_serial_number: startingSerialNumber,
          // We don't reset current_serial_number unless specified? 
          // Usually, if they set a starting number, they want to reset or jump.
          // Let's set current to starting - 1 so the next one is starting.
          current_serial_number: startingSerialNumber - 1,
          updated_at: db.fn.now()
        })
        .returning('*');
      return NextResponse.json(updated);
    } else {
      const [newSettings] = await db('weighbridge_settings').insert({
        branch_id: branchId,
        starting_serial_number: startingSerialNumber,
        current_serial_number: startingSerialNumber - 1
      }).returning('*');
      return NextResponse.json(newSettings);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
