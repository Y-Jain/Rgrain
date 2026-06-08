import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { analyticsCache } from '@/lib/analytics-cache';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const slipNo = searchParams.get('slipNo');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const status = searchParams.get('status');

    // SECURITY FIX: Enforce Tenant Boundaries (Cross-Tenant IDOR)
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (payload.role !== 'superadmin' && branchId && payload.branchId !== branchId) {
      return NextResponse.json({ error: 'Forbidden: You cannot view small scale entries for other branches' }, { status: 403 });
    }

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
      const cleanSlipNo = slipNo.replace(/[^0-9]/g, '');
      if (cleanSlipNo) {
        query = query.whereRaw('id::text ILIKE ?', [`%${cleanSlipNo}%`]);
      }
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

export async function POST(request: NextRequest) {
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

    // SECURITY FIX: Prevent Cross-Tenant Stock Injection
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (payload.role !== 'superadmin' && payload.branchId !== branchId) {
      return NextResponse.json({ error: 'Forbidden: Cannot create stock entries for other branches' }, { status: 403 });
    }

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

    analyticsCache.clear();
    return NextResponse.json(newEntry);
  } catch (error: any) {
    console.error("Small scale API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
