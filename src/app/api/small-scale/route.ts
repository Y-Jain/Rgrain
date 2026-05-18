import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const slipNo = searchParams.get('slipNo');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const status = searchParams.get('status');

    let query = db('small_scale_entries')
      .orderBy('created_at', 'desc');

    if (branchId) {
      query = query.where('branch_id', branchId);
    }

    if (status) {
      query = query.where('status', status);
    }

    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }
    if (endDate) {
      query = query.where('created_at', '<=', `${endDate} 23:59:59`);
    }
    if (slipNo) {
      query = query.where('id', slipNo);
    }
    if (category) {
      query = query.where('grain_category', category);
    }
    if (subcategory) {
      query = query.where('subcategory', subcategory);
    }

    const entries = await query;
    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      branchId,
      bags,
      totalWeight,
      totalBags,
      moisture,
      foreignMatter,
      storageLocation,
      createdBy,
      entryType, // 'IN' or 'OUT'
      partyName,
      partyMobile,
      partyEmail,
      address,
      grainCategory,
      subcategory,
      pricePerUnit,
      totalAmount
    } = body;

    const [newEntry] = await db('small_scale_entries').insert({
      branch_id: branchId,
      bags: JSON.stringify(bags || []),
      total_weight: parseFloat(totalWeight) || 0,
      total_bags: parseInt(totalBags) || 0,
      moisture: parseFloat(moisture) || null,
      foreign_matter: parseFloat(foreignMatter) || null,
      storage_location: storageLocation,
      created_by: createdBy,
      entry_type: entryType || 'IN',
      party_name: partyName,
      party_mobile: partyMobile,
      party_email: partyEmail,
      address: address,
      grain_category: grainCategory,
      subcategory: subcategory,
      price_per_unit: parseFloat(pricePerUnit) || 0,
      total_amount: parseFloat(totalAmount) || 0,
      status: 'PENDING'
    }).returning('*');

    return NextResponse.json(newEntry);
  } catch (error: any) {
    console.error("Small scale API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
