import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { analyticsCache } from '@/lib/analytics-cache';
import { verifyToken } from '@/lib/auth-utils';
import { checkRateLimit } from '@/lib/security';

export async function GET(
  request: NextRequest,
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`slips_patch_${ip}`, 60, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejectReason, net_weight, rate_per_mt, payable_amount, tollkata_charges, scaleType, farmer_name, farmer_mobile, address, vehicle_no, items } = body;

    // SECURITY FIX: Enforce Backend RBAC for Approvals
    if (status === 'APPROVED' || status === 'REJECTED') {
      const token = request.cookies.get('auth-token')?.value;
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      
      const payload = await verifyToken(token);
      if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      
      const isSuperAdmin = payload.role === 'superadmin';
      const isAdmin = payload.role === 'admin';
      const template = (payload.permissions as any)?.template;
      const isCashier = typeof template === 'string' && template.includes('Cashier');
      
      if (!isSuperAdmin && !isAdmin && !isCashier) {
        return NextResponse.json({ error: 'Forbidden: Insufficient privileges to approve slips' }, { status: 403 });
      }
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (status !== undefined) updateData.status = status;

    if (scaleType === 'Small Scale') {
      if (net_weight !== undefined) updateData.total_weight = net_weight;
      if (rate_per_mt !== undefined) updateData.price_per_unit = rate_per_mt;
      if (net_weight !== undefined && rate_per_mt !== undefined) {
        updateData.total_amount = (net_weight/100) * rate_per_mt;
      } else if (payable_amount !== undefined) {
        updateData.total_amount = payable_amount;
      }
      if (farmer_name !== undefined) updateData.party_name = farmer_name;
      if (farmer_mobile !== undefined) updateData.party_mobile = farmer_mobile;
      if (address !== undefined) updateData.address = address;

      const updatedSS = await db.transaction(async (trx) => {
        const [ss] = await trx('small_scale_entries')
          .where('id', id)
          .update(updateData)
          .returning('*');
        
        if (!ss) return null;

        if (status === 'APPROVED') {
          if (ss.entry_type === 'OUT') {
            await trx('weighbridge_settings').where({ branch_id: ss.branch_id }).forUpdate().first();
            const stockIn = await trx('weighbridge_slips').where({ branch_id: ss.branch_id, grain_category: ss.grain_category, status: 'APPROVED', entry_type: 'IN', is_internal: true }).sum('net_weight as sum').first();
            const stockOut = await trx('weighbridge_slips').where({ branch_id: ss.branch_id, grain_category: ss.grain_category, status: 'APPROVED', entry_type: 'OUT', is_internal: true }).sum('net_weight as sum').first();
            const ssStockIn = await trx('small_scale_entries').where({ branch_id: ss.branch_id, grain_category: ss.grain_category, status: 'APPROVED', entry_type: 'IN' }).sum('total_weight as sum').first();
            const ssStockOut = await trx('small_scale_entries').where({ branch_id: ss.branch_id, grain_category: ss.grain_category, status: 'APPROVED', entry_type: 'OUT' }).sum('total_weight as sum').first();

            const availableWb = (parseFloat(stockIn?.sum as string || '0')) - (parseFloat(stockOut?.sum as string || '0'));
            const availableSs = (parseFloat(ssStockIn?.sum as string || '0')) - (parseFloat(ssStockOut?.sum as string || '0'));
            const available = availableWb + availableSs;
            
            if (parseFloat(ss.total_weight) > available) {
              throw new Error(`Insufficient internal stock for ${ss.grain_category}. Available: ${(available/100).toFixed(3)} Qtl`);
            }
          }

          const existingLedger = await trx('ledgers').where({ related_id: ss.id }).first();
          if (!existingLedger) {
            const ledgerType = 'INTERNAL';
            const lastEntry = await trx('ledgers')
              .where({ branch_id: ss.branch_id, ledger_type: ledgerType })
              .orderBy('created_at', 'desc')
              .forUpdate()
              .first();
            
            const lastBalance = parseFloat(lastEntry?.balance || '0');
            const amount = parseFloat(ss.total_amount) || 0;
            const newBalance = ss.entry_type === 'IN' ? lastBalance + amount : lastBalance - amount;

            await trx('ledgers').insert({
              branch_id: ss.branch_id,
              ledger_type: ledgerType,
              related_id: ss.id,
              narration: `Small Scale ${ss.entry_type === 'IN' ? 'Purchase' : 'Sale'} - SS-${ss.id.substring(0, 8)} (${ss.grain_category})`,
              debit: ss.entry_type === 'OUT' ? amount : 0,
              credit: ss.entry_type === 'IN' ? amount : 0,
              balance: newBalance
            });
          }
        }
        return ss;
      });
      
      if (!updatedSS) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
      analyticsCache.clear();
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
      if (tollkata_charges !== undefined) updateData.tollkata_charges = tollkata_charges;
      if (address !== undefined) updateData.address = address;
      if (vehicle_no !== undefined) updateData.vehicle_no = vehicle_no;
      if (items !== undefined) updateData.items = typeof items === 'string' ? items : JSON.stringify(items);

      const updatedSlip = await db.transaction(async (trx) => {
        const [slip] = await trx('weighbridge_slips')
          .where('id', id)
          .update(updateData)
          .returning('*');

        if (!slip) return null;

        if (status === 'APPROVED') {
          if (slip.entry_type === 'OUT' && slip.is_internal) {
            await trx('weighbridge_settings').where({ branch_id: slip.branch_id }).forUpdate().first();
            const stockIn = await trx('weighbridge_slips').where({ branch_id: slip.branch_id, grain_category: slip.grain_category, status: 'APPROVED', entry_type: 'IN', is_internal: true }).sum('net_weight as sum').first();
            const stockOut = await trx('weighbridge_slips').where({ branch_id: slip.branch_id, grain_category: slip.grain_category, status: 'APPROVED', entry_type: 'OUT', is_internal: true }).sum('net_weight as sum').first();
            const ssStockIn = await trx('small_scale_entries').where({ branch_id: slip.branch_id, grain_category: slip.grain_category, status: 'APPROVED', entry_type: 'IN' }).sum('total_weight as sum').first();
            const ssStockOut = await trx('small_scale_entries').where({ branch_id: slip.branch_id, grain_category: slip.grain_category, status: 'APPROVED', entry_type: 'OUT' }).sum('total_weight as sum').first();

            const availableWb = (parseFloat(stockIn?.sum as string || '0')) - (parseFloat(stockOut?.sum as string || '0'));
            const availableSs = (parseFloat(ssStockIn?.sum as string || '0')) - (parseFloat(ssStockOut?.sum as string || '0'));
            const available = availableWb + availableSs;
            
            if (parseFloat(slip.net_weight) > available) {
              throw new Error(`Insufficient internal stock for ${slip.grain_category}. Available: ${(available/100).toFixed(3)} Qtl`);
            }
          }

          // 1. Check if ledger entry already exists to avoid duplicates
          const existingLedger = await trx('ledgers').where({ related_id: slip.id }).first();
          if (!existingLedger) {
            const ledgerType = slip.is_internal ? 'INTERNAL' : 'FARMER';
            // SECURITY FIX: Added .forUpdate() to acquire a row-level lock and prevent Race Conditions during concurrent approvals
            const lastEntry = await trx('ledgers')
              .where({ branch_id: slip.branch_id, ledger_type: ledgerType })
              .orderBy('created_at', 'desc')
              .forUpdate()
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
          if (farmer_name !== undefined) {
             farmerUpdate.name = farmer_name.trim() || 'Unknown Farmer';
          }
          if (farmer_mobile !== undefined) {
             const m = farmer_mobile.trim();
             if (m) {
                farmerUpdate.mobile = m;
             } else {
                // Generate a unique NA- string if they cleared the field
                farmerUpdate.mobile = `NA-${Date.now()}${Math.floor(Math.random() * 1000)}`;
             }
          }
          await trx('farmers').where('id', slip.farmer_id).update(farmerUpdate);
        }

        return slip;
      });

      if (!updatedSlip) return NextResponse.json({ error: 'Slip not found' }, { status: 404 });
      analyticsCache.clear();
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
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`slips_delete_${ip}`, 60, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const scaleType = searchParams.get('scaleType');

    if (scaleType === 'Small Scale') {
      await db('ledgers').where({ related_id: id }).del();
      await db('small_scale_entries').where({ id }).del();
      analyticsCache.clear();
      return NextResponse.json({ success: true });
    } else {
      await db('ledgers').where({ related_id: id }).del();
      await db('weighbridge_slips').where({ id }).del();
      analyticsCache.clear();
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
