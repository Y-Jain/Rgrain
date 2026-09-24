import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { analyticsCache } from '@/lib/analytics-cache';
import { checkRateLimit, encryptData, decryptData } from '@/lib/security';

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
        db.raw('weighbridge_slips.net_weight as normalized_weight'),
        'weighbridge_slips.rate_per_mt as rate_per_mt',
        'weighbridge_slips.payable_amount as payable_amount',
        'weighbridge_slips.is_internal as is_internal',
        'weighbridge_slips.entry_type as entry_type',
        'farmers.name as farmer_name',
        'farmers.mobile as farmer_mobile',
        'farmers.village as farmer_village',
        'weighbridge_slips.tollkata_charges as tollkata_charges',
        db.raw('weighbridge_slips.serial_number::text as serial_number'),
        db.raw("'Weighbridge' as scale_type")
      );

    // Define small_scale_entries query
    const ssQuery = db('small_scale_entries')
      .select(
        'id as id',
        'created_at as created_at',
        'status as status',
        'slip_no as slip_no',
        db.raw("'Small Scale' as vehicle_no"),
        'grain_category as grain_category',
        'subcategory as subcategory',
        'total_weight as net_weight',
        db.raw('total_weight as normalized_weight'),
        'price_per_unit as rate_per_mt',
        'total_amount as payable_amount',
        db.raw("true as is_internal"),
        'entry_type as entry_type',
        db.raw("coalesce(party_name, 'Cash/General') as farmer_name"),
        db.raw("coalesce(party_mobile, '-') as farmer_mobile"),
        db.raw("coalesce(address, '-') as farmer_village"),
        db.raw("0 as tollkata_charges"),
        'group_id as serial_number',
        db.raw("'Small Scale' as scale_type")
      );

    // Apply filters to wbQuery
    if (branchId) {
      wbQuery.where('weighbridge_slips.branch_id', branchId);
    }
    if (status) {
      wbQuery.where('weighbridge_slips.status', 'ilike', status);
    }
    if (type && type !== 'ALL') {
      wbQuery.where('weighbridge_slips.entry_type', type);
    }
    if (dateFrom) {
      wbQuery.where('weighbridge_slips.created_at', '>=', `${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      wbQuery.where('weighbridge_slips.created_at', '<=', `${dateTo} 23:59:59`);
    }
    if (category) {
      wbQuery.where('weighbridge_slips.grain_category', category);
    }
    if (subcategory) {
      wbQuery.where('weighbridge_slips.subcategory', subcategory);
    }
    if (entryMode && entryMode !== 'ALL') {
      wbQuery.where('weighbridge_slips.is_internal', entryMode === 'INTERNAL');
    }
    if (search) {
      wbQuery.where(function() {
        this.where('farmers.name', 'ilike', `%${search}%`)
            .orWhere('weighbridge_slips.vehicle_no', 'ilike', `%${search}%`)
            .orWhere('weighbridge_slips.grain_category', 'ilike', `%${search}%`)
            .orWhere('weighbridge_slips.slip_no', 'ilike', `%${search}%`);
      });
    }

    // Apply filters to ssQuery
    if (branchId) {
      ssQuery.where('branch_id', branchId);
    }
    if (status) {
      ssQuery.where('status', 'ilike', status);
    }
    if (type && type !== 'ALL') {
      ssQuery.where('entry_type', type);
    }
    if (category) {
      ssQuery.where('grain_category', category);
    }
    if (subcategory) {
      ssQuery.where('subcategory', subcategory);
    }
    if (dateFrom) {
      ssQuery.where('created_at', '>=', `${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      ssQuery.where('created_at', '<=', `${dateTo} 23:59:59`);
    }
    if (entryMode === 'INTERNAL') {
      // Small scale is always internal
    } else if (entryMode === 'EXTERNAL') {
      ssQuery.whereRaw('1 = 0');
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
      db.raw('sum(normalized_weight) as total_weight'),
      db.raw('sum(payable_amount) as total_amount'),
      db.raw('sum(tollkata_charges) as total_charges')
    ).from(combinedQuery).first();

    const totalWeight = parseFloat((totalsResult as any)?.total_weight as string || '0');
    const totalAmount = parseFloat((totalsResult as any)?.total_amount as string || '0');
    const totalCharges = parseFloat((totalsResult as any)?.total_charges as string || '0');

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
        totalAmount,
        totalCharges
      }
    });
  } catch (error: any) {
    console.error("GET Slips Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`slips_post_${ip}`, 60, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const body = await request.json();
    const { 
      farmerName, 
      farmerMobile, 
      address,
      entryType,
      branchId,
      createdById,
      trollies, // Array of trolley objects
      serialNumber // Include serialNumber from body
    } = body;

    // SECURITY FIX: Input Validation for Negative Numbers
    if (!trollies || !Array.isArray(trollies) || trollies.length === 0) {
      return NextResponse.json({ error: 'Bad Request: No trollies provided' }, { status: 400 });
    }

    for (const trolly of trollies) {
      const gross = parseFloat(trolly.grossWeight) || 0;
      const tare = parseFloat(trolly.tareWeight) || 0;
      const net = parseFloat(trolly.netWeight) || 0;
      const rate = parseFloat(trolly.rate) || 0;
      const amount = parseFloat(trolly.totalAmount) || 0;
      
      if (gross < 0 || tare < 0 || net < 0 || rate < 0 || amount < 0) {
        return NextResponse.json({ error: 'Bad Request: Weights and monetary amounts cannot be negative.' }, { status: 400 });
      }
    }

    // 1. Find or create farmer/customer
    const targetMobile = farmerMobile?.trim();
    const allFarmers = await db('farmers').select('id', 'mobile', 'name');
    let farmer = null;
    
    if (targetMobile) {
      farmer = allFarmers.find(f => {
        if (!f.mobile) return false;
        try {
          const plainMobile = decryptData(f.mobile) || f.mobile;
          return plainMobile === targetMobile;
        } catch {
          return f.mobile === targetMobile;
        }
      });
    }

    if (!farmer) {
      const newMobile = targetMobile || `NA-${Date.now()}`;
      const [newFarmer] = await db('farmers').insert({
        name: farmerName || (entryType === 'IN' ? 'Unknown Farmer' : 'Unknown Customer'),
        mobile: encryptData(newMobile),
        village: address || null,
        branch_id: branchId || null
      }).returning('*');
      farmer = newFarmer;
    }

    // 2. Generate slip number and Serial Number
    const newSlip = await db.transaction(async (trx) => {
      // Get settings for serial number
      let settings = await trx('weighbridge_settings').where({ branch_id: branchId }).forUpdate().first();
      if (!settings) {
        [settings] = await trx('weighbridge_settings').insert({
          branch_id: branchId,
          starting_serial_number: 1,
          current_serial_number: 0
        }).returning('*');
      }

      let serialNumberPassed = parseInt(serialNumber, 10);
      let serialToUse;
      let newCurrentSerial = settings.current_serial_number;

      if (!isNaN(serialNumberPassed)) {
        serialToUse = serialNumberPassed;
        if (serialToUse > settings.current_serial_number) {
          newCurrentSerial = serialToUse;
        }
      } else {
        const nextSerial = (settings.current_serial_number || 0) + 1;
        serialToUse = nextSerial < settings.starting_serial_number ? settings.starting_serial_number : nextSerial;
        newCurrentSerial = serialToUse;
      }

      // Update settings
      await trx('weighbridge_settings')
        .where({ id: settings.id })
        .update({ current_serial_number: newCurrentSerial, updated_at: trx.fn.now() });

      const insertedSlips = [];

      for (let i = 0; i < trollies.length; i++) {
        const trolly = trollies[i];
        const slipNo = trollies.length > 1 
          ? `SLIP-${serialToUse.toString().padStart(6, '0')}-${i+1}`
          : `SLIP-${serialToUse.toString().padStart(6, '0')}`;

        // 3. Stock Validation for Internal OUT
        if (entryType === 'OUT' && trolly.isInternal) {
          const stockIn = await trx('weighbridge_slips')
            .where({ branch_id: branchId, grain_category: trolly.grainType, status: 'APPROVED', entry_type: 'IN', is_internal: true })
            .sum('net_weight as sum')
            .first();
          
          const stockOut = await trx('weighbridge_slips')
            .where({ branch_id: branchId, grain_category: trolly.grainType, status: 'APPROVED', entry_type: 'OUT', is_internal: true })
            .sum('net_weight as sum')
            .first();

          const ssStockIn = await trx('small_scale_entries')
            .where({ branch_id: branchId, grain_category: trolly.grainType, status: 'APPROVED', entry_type: 'IN' })
            .sum('total_weight as sum')
            .first();

          const ssStockOut = await trx('small_scale_entries')
            .where({ branch_id: branchId, grain_category: trolly.grainType, status: 'APPROVED', entry_type: 'OUT' })
            .sum('total_weight as sum')
            .first();
          
          const availableWb = (parseFloat(stockIn?.sum as string || '0')) - (parseFloat(stockOut?.sum as string || '0'));
          const availableSs = (parseFloat(ssStockIn?.sum as string || '0')) - (parseFloat(ssStockOut?.sum as string || '0'));
          const available = availableWb + availableSs;
          
          if (parseFloat(trolly.netWeight) > available) {
            throw new Error(`Insufficient internal stock for ${trolly.grainType}. Available: ${(available/100).toFixed(3)} Qtl`);
          }
        }

        // 4. Insert slip
        const [insertedSlip] = await trx('weighbridge_slips').insert({
          slip_no: slipNo,
          serial_number: serialToUse,
          farmer_id: farmer.id,
          vehicle_no: trolly.vehicleNumber || 'N/A',
          driver_name: trolly.driverName,
          grain_category: trolly.grainType,
          subcategory: trolly.subcategory,
          vehicle_type: trolly.vehicleType || null,
          tollkata_charges: parseFloat(trolly.tollkataCharges) || 0,
          gross_weight: parseFloat(trolly.grossWeight) || 0,
          tare_weight: parseFloat(trolly.tareWeight) || 0,
          net_weight: parseFloat(trolly.netWeight) || 0,
          rate_per_mt: parseFloat(trolly.rate) || 0,
          payable_amount: parseFloat(trolly.totalAmount) || 0,
          is_internal: trolly.isInternal || false,
          entry_type: entryType || 'IN',
          status: 'PENDING',
          address: address,
          branch_id: branchId,
          created_by: createdById
        }).returning('*');

        insertedSlips.push(insertedSlip);
      }

      return insertedSlips;
    });

      const slipWithFarmer = {
      ...newSlip[0], // We can just return the first one as representative for immediate UI logic, OR return all. Let's return all, and add items array.
      farmer_name: farmer.name,
      farmer_mobile: farmer.mobile,
      items: newSlip // Attach all trollies to the first slip so the Modal can print them as a table
    };

    analyticsCache.clear();
    return NextResponse.json(slipWithFarmer);
  } catch (error: any) {
    console.error("Slip POST Error:", error);
    if (error.message && error.message.includes("duplicate key value violates unique constraint")) {
      return NextResponse.json({ error: "The Tollkata S.No you provided is already in use. Please enter a different number or refresh the page." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
