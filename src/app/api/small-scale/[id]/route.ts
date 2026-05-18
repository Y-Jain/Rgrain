import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejectReason, total_weight, price_per_unit, total_amount, party_name, party_mobile, address } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = { 
      status, 
      reject_reason: rejectReason,
      updated_at: db.fn.now() 
    };

    if (total_weight !== undefined) updateData.total_weight = total_weight;
    if (price_per_unit !== undefined) updateData.price_per_unit = price_per_unit;
    if (total_amount !== undefined) updateData.total_amount = total_amount;
    if (party_name !== undefined) updateData.party_name = party_name;
    if (party_mobile !== undefined) updateData.party_mobile = party_mobile;
    if (address !== undefined) updateData.address = address;

    const updatedEntry = await db.transaction(async (trx) => {
      const [entry] = await trx('small_scale_entries')
        .where({ id })
        .update(updateData)
        .returning('*');

      if (!entry) return null;

      if (status === 'APPROVED') {
        // 1. Check if ledger entry already exists
        const existingLedger = await trx('ledgers').where({ related_id: entry.id }).first();
        if (!existingLedger) {
          const ledgerType = entry.entry_type === 'OUT' ? 'CUSTOMER' : 'FARMER';
          const lastEntry = await trx('ledgers')
            .where({ branch_id: entry.branch_id, ledger_type: ledgerType })
            .orderBy('created_at', 'desc')
            .first();
          
          const lastBalance = parseFloat(lastEntry?.balance || '0');
          const amount = parseFloat(entry.total_amount) || 0;
          
          // For Farmer (Credit) and Customer (Debit), we increase balance (outstanding)
          const newBalance = lastBalance + amount;

          await trx('ledgers').insert({
            branch_id: entry.branch_id,
            ledger_type: ledgerType,
            related_id: entry.id,
            narration: `Small Scale ${entry.entry_type === 'OUT' ? 'Sale' : 'Purchase'} - ${entry.party_name || 'Cash/General'} (${entry.grain_category})`,
            debit: entry.entry_type === 'OUT' ? amount : 0,
            credit: entry.entry_type === 'IN' ? amount : 0,
            balance: newBalance
          });
        }
      }

      return entry;
    });

    if (!updatedEntry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    return NextResponse.json(updatedEntry);
  } catch (error: any) {
    console.error("Update Small Scale Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Also delete associated ledger entry
    await db('ledgers').where({ related_id: id, narration: db.raw('??', [`Small Scale %`]) }).del();
    
    // Note: The narration check above is a bit loose, ideally we'd have a more specific way to link them
    // but based on current implementation, this is how we find it.
    // Actually, ledgers table has related_id.
    
    await db('ledgers').where({ related_id: id }).del();
    await db('small_scale_entries').where({ id }).del();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Small Scale Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
