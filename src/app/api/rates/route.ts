import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    let query = db('grain_rates').orderBy('category_name', 'asc');
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
    const { branchId, categoryName, procurementRate, sellingRate, subcategories } = body;

    if (!branchId || !categoryName) {
      return NextResponse.json({ error: 'Branch ID and Category Name are required' }, { status: 400 });
    }

    // Upsert logic: if branch_id + category_name exists, update, else insert
    const existing = await db('grain_rates')
      .where({ branch_id: branchId, category_name: categoryName })
      .first();

    if (existing) {
      const [updated] = await db('grain_rates')
        .where({ id: existing.id })
        .update({
          procurement_rate: parseFloat(procurementRate) || 0,
          selling_rate: parseFloat(sellingRate) || 0,
          subcategories: JSON.stringify(subcategories || []),
          updated_at: db.fn.now()
        })
        .returning('*');
      return NextResponse.json(updated);
    } else {
      const [newRate] = await db('grain_rates').insert({
        branch_id: branchId,
        category_name: categoryName,
        procurement_rate: parseFloat(procurementRate) || 0,
        selling_rate: parseFloat(sellingRate) || 0,
        subcategories: JSON.stringify(subcategories || []),
        is_active: true
      }).returning('*');
      return NextResponse.json(newRate);
    }
  } catch (error: any) {
    console.error("Rates API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) throw new Error("ID is required");

    await db('grain_rates').where({ id }).del();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
