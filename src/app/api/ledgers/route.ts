import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const type = searchParams.get('type') || 'FARMER';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const source = searchParams.get('source'); // 'WEIGHBRIDGE', 'SMALL_SCALE', 'ALL'

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { branchId, type, narration, amount, relatedId, entryType } = body; // entryType: 'DEBIT' or 'CREDIT'

    if (!branchId || !type || !amount || !narration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newEntry] = await db.transaction(async (trx) => {
      // Get last balance
      const lastEntry = await trx('ledgers')
        .where({ branch_id: branchId, ledger_type: type })
        .orderBy('created_at', 'desc')
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
