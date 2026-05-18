import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const slip = await db('weighbridge_slips')
      .leftJoin('farmers', 'weighbridge_slips.farmer_id', 'farmers.id')
      .where('weighbridge_slips.id', id)
      .select(
        'weighbridge_slips.*',
        'farmers.name as farmer_name',
        'farmers.mobile as farmer_mobile',
        'farmers.village as farmer_village',
        'farmers.district as farmer_district'
      )
      .first();

    if (!slip) {
      return NextResponse.json({ error: 'Slip not found' }, { status: 404 });
    }

    return NextResponse.json(slip);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejectReason, net_weight, rate_per_mt, payable_amount, scaleType, farmer_name, farmer_mobile, address, vehicle_no } = body;

    const updateData: any = {
      updated_at: new Date()
    };

    if (status !== undefined) updateData.status = status;

    if (scaleType === 'Small Scale') {
      if (net_weight !== undefined) updateData.total_weight = net_weight;
      if (rate_per_mt !== undefined) updateData.price_per_unit = rate_per_mt;
      if (net_weight !== undefined && rate_per_mt !== undefined) {
        updateData.total_amount = net_weight * rate_per_mt;
      } else if (payable_amount !== undefined) {
        updateData.total_amount = payable_amount;
      }
      if (farmer_name !== undefined) updateData.party_name = farmer_name;
      if (farmer_mobile !== undefined) updateData.party_mobile = farmer_mobile;
      if (address !== undefined) updateData.address = address;

      const [updatedSS] = await db('small_scale_entries')
        .where('id', id)
        .update(updateData)
        .returning('*');
      
      if (!updatedSS) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      return NextResponse.json(updatedSS);
    } else {
      if (rejectReason !== undefined) updateData.rejection_reason = rejectReason;
      if (net_weight !== undefined) updateData.net_weight = net_weight;
      if (rate_per_mt !== undefined) updateData.rate_per_mt = rate_per_mt;
      if (net_weight !== undefined && rate_per_mt !== undefined) {
        updateData.payable_amount = (net_weight / 100) * rate_per_mt;
      } else if (payable_amount !== undefined) {
        updateData.payable_amount = payable_amount;
      }
      if (address !== undefined) updateData.address = address;
      if (vehicle_no !== undefined) updateData.vehicle_no = vehicle_no;

      const updatedSlip = await db.transaction(async (trx) => {
        const [slip] = await trx('weighbridge_slips')
          .where('id', id)
          .update(updateData)
          .returning('*');

        if (!slip) return null;

        if (status === 'APPROVED') {
          // 1. Check if ledger entry already exists to avoid duplicates
          const existingLedger = await trx('ledgers').where({ related_id: slip.id }).first();
          if (!existingLedger) {
            const ledgerType = slip.is_internal ? 'INTERNAL' : 'FARMER';
            const lastEntry = await trx('ledgers')
              .where({ branch_id: slip.branch_id, ledger_type: ledgerType })
              .orderBy('created_at', 'desc')
              .first();
            
            const lastBalance = parseFloat(lastEntry?.balance || '0');
            const amount = parseFloat(slip.payable_amount) || 0;
            const newBalance = slip.entry_type === 'IN' ? lastBalance + amount : lastBalance - amount;

            await trx('ledgers').insert({
              branch_id: slip.branch_id,
              ledger_type: ledgerType,
              related_id: slip.id,
              narration: `${slip.entry_type === 'IN' ? 'Purchase' : 'Sale'} - ${slip.slip_no} (${slip.grain_category})`,
              debit: slip.entry_type === 'OUT' ? amount : 0,
              credit: slip.entry_type === 'IN' ? amount : 0,
              balance: newBalance
            });
          }
        }

        // Handle Farmer detail updates
        if (slip.farmer_id && (farmer_name !== undefined || farmer_mobile !== undefined)) {
          const farmerUpdate: any = {};
          if (farmer_name !== undefined) farmerUpdate.name = farmer_name;
          if (farmer_mobile !== undefined) farmerUpdate.mobile = farmer_mobile;
          await trx('farmers').where('id', slip.farmer_id).update(farmerUpdate);
        }

        return slip;
      });

      if (!updatedSlip) return NextResponse.json({ error: 'Slip not found' }, { status: 404 });
      return NextResponse.json(updatedSlip);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const scaleType = searchParams.get('scaleType');

    if (scaleType === 'Small Scale') {
      await db('ledgers').where({ related_id: id }).del();
      await db('small_scale_entries').where({ id }).del();
      return NextResponse.json({ success: true });
    } else {
      await db('ledgers').where({ related_id: id }).del();
      await db('weighbridge_slips').where({ id }).del();
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
