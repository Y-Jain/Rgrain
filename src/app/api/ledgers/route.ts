import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const type = searchParams.get('type') || 'FARMER';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const source = searchParams.get('source'); // 'WEIGHBRIDGE', 'SMALL_SCALE', 'ALL'

    // SECURITY FIX: Enforce Tenant Boundaries (Cross-Tenant IDOR)
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (payload.role !== 'superadmin' && payload.branchId !== branchId) {
      return NextResponse.json({ error: 'Forbidden: You cannot view ledgers for other branches' }, { status: 403 });
    }

    let query = db('ledgers')
      .where({ branch_id: branchId, ledger_type: type });

    if (startDate) {
      query = query.where('created_at', '>=', startDate);
    }
    if (endDate) {
      query = query.where('created_at', '<=', `${endDate} 23:59:59`);
    }

    if (source === 'WEIGHBRIDGE') {
      query = query.where('narration', 'not ilike', '%Small Scale%');
    } else if (source === 'SMALL_SCALE') {
      query = query.where('narration', 'ilike', '%Small Scale%');
    }

    const entries = await query.orderBy('created_at', 'desc');
    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { branchId, type, narration, amount, relatedId, entryType } = body; // entryType: 'DEBIT' or 'CREDIT'

    if (!branchId || !type || !amount || !narration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // SECURITY FIX: Enforce Backend RBAC for Manual Ledger Entries
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const isSuperAdmin = payload.role === 'superadmin';
    const isAdmin = payload.role === 'admin';
    const permissionsTemplate = (payload.permissions as any)?.template;
    const isCashier = typeof permissionsTemplate === 'string' && permissionsTemplate.includes('Cashier');
    
    if (!isSuperAdmin && !isAdmin && !isCashier) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges to modify ledgers' }, { status: 403 });
    }

    // Validate Branch ID
    if (!isSuperAdmin && payload.branchId !== branchId) {
       return NextResponse.json({ error: 'Forbidden: Cannot modify ledgers for other branches' }, { status: 403 });
    }

    const [newEntry] = await db.transaction(async (trx) => {
      // SECURITY FIX: Added .forUpdate() to acquire a row-level lock and prevent Race Conditions
      const lastEntry = await trx('ledgers')
        .where({ branch_id: branchId, ledger_type: type })
        .orderBy('created_at', 'desc')
        .forUpdate()
        .first();
      
      const lastBalance = parseFloat(lastEntry?.balance || '0');
      const val = parseFloat(amount);
      
      // Balance = Last Balance + (Debit - Credit)
      const debitVal = entryType === 'DEBIT' ? val : 0;
      const creditVal = entryType === 'CREDIT' ? val : 0;
      const newBalance = lastBalance + debitVal - creditVal;

      return trx('ledgers').insert({
        branch_id: branchId,
        ledger_type: type,
        related_id: relatedId || null,
        narration: narration,
        debit: debitVal,
        credit: creditVal,
        balance: newBalance
      }).returning('*');
    });

    return NextResponse.json(newEntry);
  } catch (error: any) {
    console.error("Ledger POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
