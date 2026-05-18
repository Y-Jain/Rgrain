import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    let query = db('holidays');
    if (branchId) {
      query = query.where((builder) => {
        builder.where('branch_id', branchId).orWhereNull('branch_id');
      });
    }

    const holidays = await query.orderBy('date', 'asc');
    return NextResponse.json(holidays);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, description, branchId } = body;

    const [newHoliday] = await db('holidays').insert({
      date,
      description,
      branch_id: branchId || null
    }).returning('*');

    return NextResponse.json(newHoliday);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) throw new Error("Holiday ID is required");

    await db('holidays').where({ id }).del();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
