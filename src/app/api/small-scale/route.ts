import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { analyticsCache } from '@/lib/analytics-cache';
import { verifyToken } from '@/lib/auth-utils';
import { checkRateLimit } from '@/lib/security';

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
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`ss_post_${ip}`, 60, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const body = await request.json();
    const { 
      branchId,
      createdBy,
      entryType, // 'IN' or 'OUT'
      partyName,
      partyMobile,
      partyEmail,
      address,
      items
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required.' }, { status: 400 });
    }

    // SECURITY FIX: Input Validation for Negative Numbers
    for (const item of items) {
      const weight = parseFloat(item.totalWeight) || 0;
      const rate = parseFloat(item.pricePerUnit) || 0;
      const amount = parseFloat(item.totalAmount) || 0;

      if (weight <= 0) {
        return NextResponse.json({ error: 'Bad Request: Weight must be greater than 0.' }, { status: 400 });
      }
      if (rate < 0 || amount < 0) {
        return NextResponse.json({ error: 'Bad Request: Weights and monetary amounts cannot be negative.' }, { status: 400 });
      }
    }

    // SECURITY FIX: Prevent Cross-Tenant Stock Injection
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (payload.role !== 'superadmin' && payload.branchId !== branchId) {
      return NextResponse.json({ error: 'Forbidden: Cannot create stock entries for other branches' }, { status: 403 });
    }

    // Generate a unique group_id and base slip_no
    const groupId = Date.now().toString();
    const slipPrefix = `SS-${groupId.substring(groupId.length - 8)}`;

    const rowsToInsert = items.map((item, index) => ({
      branch_id: branchId,
      bags: JSON.stringify(item.bags || []),
      total_weight: parseFloat(item.totalWeight) || 0,
      total_bags: parseInt(item.totalBags) || 0,
      moisture: parseFloat(item.moisture) || null,
      foreign_matter: parseFloat(item.foreignMatter) || null,
      storage_location: item.storageLocation,
      created_by: createdBy,
      entry_type: entryType || 'IN',
      party_name: partyName,
      party_mobile: partyMobile,
      party_email: partyEmail,
      address: address,
      grain_category: item.grainCategory,
      subcategory: item.subcategory,
      price_per_unit: parseFloat(item.pricePerUnit) || 0,
      total_amount: parseFloat(item.totalAmount) || 0,
      status: 'PENDING',
      group_id: groupId,
      slip_no: items.length > 1 ? `${slipPrefix}-${index + 1}` : slipPrefix
    }));

    const insertedEntries = await db('small_scale_entries').insert(rowsToInsert).returning('*');

    analyticsCache.clear();
    return NextResponse.json(insertedEntries);
  } catch (error: any) {
    console.error("Small scale API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
