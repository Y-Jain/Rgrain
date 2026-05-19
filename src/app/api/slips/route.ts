import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { analyticsCache } from '@/lib/analytics-cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const type = searchParams.get('type') || 'ALL'; // IN, OUT, ALL
    const scaleSource = searchParams.get('scaleSource') || 'ALL'; // WEIGHBRIDGE, SMALL_SCALE, ALL
    const entryMode = searchParams.get('entryMode') || 'ALL'; // INTERNAL, EXTERNAL, ALL

    const offset = (page - 1) * limit;

    // Define weighbridge_slips query
    const wbQuery = db('weighbridge_slips')
      .leftJoin('farmers', 'weighbridge_slips.farmer_id', 'farmers.id')
      .select(
        'weighbridge_slips.id as id',
        'weighbridge_slips.created_at as created_at',
        'weighbridge_slips.status as status',
        'weighbridge_slips.slip_no as slip_no',
        'weighbridge_slips.vehicle_no as vehicle_no',
        'weighbridge_slips.grain_category as grain_category',
        'weighbridge_slips.subcategory as subcategory',
        'weighbridge_slips.net_weight as net_weight',
        'weighbridge_slips.rate_per_mt as rate_per_mt',
        'weighbridge_slips.payable_amount as payable_amount',
        'weighbridge_slips.is_internal as is_internal',
        'weighbridge_slips.entry_type as entry_type',
        'farmers.name as farmer_name',
        'farmers.mobile as farmer_mobile',
        'farmers.village as farmer_village',
        db.raw("'Weighbridge' as scale_type")
      );

    // Define small_scale_entries query
    const ssQuery = db('small_scale_entries')
      .select(
        'id as id',
        'created_at as created_at',
        'status as status',
        db.raw("concat('SS-', lpad(id::text, 5, '0')) as slip_no"),
        db.raw("'Small Scale' as vehicle_no"),
        'grain_category as grain_category',
        'subcategory as subcategory',
        'total_weight as net_weight',
        'price_per_unit as rate_per_mt',
        'total_amount as payable_amount',
        db.raw("true as is_internal"),
        'entry_type as entry_type',
        db.raw("coalesce(party_name, 'Cash/General') as farmer_name"),
        db.raw("coalesce(party_mobile, '-') as farmer_mobile"),
        db.raw("coalesce(address, '-') as farmer_village"),
        db.raw("'Small Scale' as scale_type")
      );

    // Apply filters to wbQuery
    if (branchId) {
      wbQuery.where('weighbridge_slips.branch_id', branchId);
    }
    if (status) {
      wbQuery.where('weighbridge_slips.status', status);
    }
    if (type && type !== 'ALL') {
      wbQuery.where('weighbridge_slips.entry_type', type);
    }
    if (entryMode === 'INTERNAL') {
      wbQuery.where('weighbridge_slips.is_internal', true);
    } else if (entryMode === 'EXTERNAL') {
      wbQuery.where('weighbridge_slips.is_internal', false);
    }
    if (category) {
      wbQuery.where('weighbridge_slips.grain_category', category);
    }
    if (subcategory) {
      wbQuery.where('weighbridge_slips.subcategory', 'ilike', `%${subcategory}%`);
    }
    if (dateFrom) {
      wbQuery.where('weighbridge_slips.created_at', '>=', `${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      wbQuery.where('weighbridge_slips.created_at', '<=', `${dateTo} 23:59:59`);
    }
    if (search) {
      wbQuery.where(function() {
        this.where('weighbridge_slips.slip_no', 'ilike', `%${search}%`)
            .orWhere('weighbridge_slips.vehicle_no', 'ilike', `%${search}%`)
            .orWhere('farmers.name', 'ilike', `%${search}%`);
      });
    }

    // Apply filters to ssQuery
    if (branchId) {
      ssQuery.where('branch_id', branchId);
    }
    if (status) {
      ssQuery.where('status', status);
    }
    if (type && type !== 'ALL') {
      ssQuery.where('entry_type', type);
    }
    if (entryMode === 'INTERNAL') {
      // Small scale is always internal, no filter needed
    } else if (entryMode === 'EXTERNAL') {
      // Small scale is never external, so return no rows
      ssQuery.whereRaw('1 = 0');
    }
    if (category) {
      ssQuery.where('grain_category', category);
    }
    if (subcategory) {
      ssQuery.where('subcategory', 'ilike', `%${subcategory}%`);
    }
    if (dateFrom) {
      ssQuery.where('created_at', '>=', `${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      ssQuery.where('created_at', '<=', `${dateTo} 23:59:59`);
    }
    if (search) {
      ssQuery.where(function() {
        this.where('party_name', 'ilike', `%${search}%`)
            .orWhere('grain_category', 'ilike', `%${search}%`);
      });
    }

    // Construct the final combined query
    let combinedQuery;
    if (scaleSource === 'WEIGHBRIDGE') {
      combinedQuery = wbQuery.as('combined_slips');
    } else if (scaleSource === 'SMALL_SCALE') {
      combinedQuery = ssQuery.as('combined_slips');
    } else {
      combinedQuery = wbQuery.unionAll(ssQuery).as('combined_slips');
    }

    // Get total count
    const countResult = await db.select(db.raw('count(*) as count')).from(combinedQuery).first();
    const totalCount = parseInt((countResult as any)?.count as string || '0');
    const totalPages = Math.ceil(totalCount / limit);

    // Get sums for totals
    const totalsResult = await db.select(
      db.raw('sum(net_weight) as total_weight'),
      db.raw('sum(payable_amount) as total_amount')
    ).from(combinedQuery).first();

    const totalWeight = parseFloat((totalsResult as any)?.total_weight as string || '0');
    const totalAmount = parseFloat((totalsResult as any)?.total_amount as string || '0');

    // Get paginated results
    const results = await db.select('*')
      .from(combinedQuery)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: results,
      totalCount,
      totalPages,
      currentPage: page,
      totals: {
        totalWeight,
        totalAmount
      }
    });
  } catch (error: any) {
    console.error("GET Slips Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      farmerName, 
      farmerMobile, 
      vehicleNumber, 
      driverName, 
      grainType, 
      grossWeight, 
      tareWeight, 
      netWeight, 
      rate, 
      totalAmount,
      address,
      isInternal,
      entryType,
      branchId,
      createdById
    } = body;

    // 1. Find or create farmer/customer
    let farmer = await db('farmers').where('mobile', farmerMobile).first();
    if (!farmer) {
      const [newFarmer] = await db('farmers').insert({
        name: farmerName || (entryType === 'IN' ? 'Unknown Farmer' : 'Unknown Customer'),
        mobile: farmerMobile || `NA-${Date.now()}`,
      }).returning('*');
      farmer = newFarmer;
    }

    // 2. Generate slip number and Serial Number
    const newSlip = await db.transaction(async (trx) => {
      // Get settings for serial number
      let settings = await trx('weighbridge_settings').where({ branch_id: branchId }).first();
      if (!settings) {
        [settings] = await trx('weighbridge_settings').insert({
          branch_id: branchId,
          starting_serial_number: 1,
          current_serial_number: 0
        }).returning('*');
      }

      const nextSerial = (settings.current_serial_number || 0) + 1;
      const serialToUse = nextSerial < settings.starting_serial_number ? settings.starting_serial_number : nextSerial;

      // Update settings
      await trx('weighbridge_settings')
        .where({ id: settings.id })
        .update({ current_serial_number: serialToUse, updated_at: trx.fn.now() });

      const slipNo = `SLIP-${serialToUse.toString().padStart(6, '0')}`;

      // 3. Stock Validation for Internal OUT
      if (entryType === 'OUT' && isInternal) {
        const stockIn = await trx('weighbridge_slips')
          .where({ branch_id: branchId, grain_category: grainType, status: 'APPROVED', entry_type: 'IN', is_internal: true })
          .sum('net_weight as sum')
          .first();
        
        const stockOut = await trx('weighbridge_slips')
          .where({ branch_id: branchId, grain_category: grainType, status: 'APPROVED', entry_type: 'OUT', is_internal: true })
          .sum('net_weight as sum')
          .first();
        
        const available = (parseFloat(stockIn?.sum as string || '0')) - (parseFloat(stockOut?.sum as string || '0'));
        
        if (parseFloat(netWeight) > available) {
          throw new Error(`Insufficient internal stock. Available: ${(available/1000).toFixed(3)} MT`);
        }
      }

      // 4. Insert slip
      const [insertedSlip] = await trx('weighbridge_slips').insert({
        slip_no: slipNo,
        serial_number: serialToUse,
        farmer_id: farmer.id,
        vehicle_no: vehicleNumber,
        driver_name: driverName,
        grain_category: grainType,
        subcategory: body.subcategory,
        vehicle_type: body.vehicleType,
        tollkata_charges: parseFloat(body.tollkataCharges) || 0,
        gross_weight: parseFloat(grossWeight) || 0,
        tare_weight: parseFloat(tareWeight) || 0,
        net_weight: parseFloat(netWeight) || 0,
        rate_per_mt: parseFloat(rate) || 0,
        payable_amount: parseFloat(totalAmount) || 0,
        is_internal: isInternal || false,
        entry_type: entryType || 'IN',
        status: 'PENDING',
        address: address,
        branch_id: branchId,
        created_by: createdById
      }).returning('*');

      return insertedSlip;
    });

    const slipWithFarmer = {
      ...newSlip,
      farmer_name: farmer.name,
      farmer_mobile: farmer.mobile
    };

    analyticsCache.clear();
    return NextResponse.json(slipWithFarmer);
  } catch (error: any) {
    console.error("Slip POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
