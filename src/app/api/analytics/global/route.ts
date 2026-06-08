import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // SECURITY FIX: Enforce Superadmin RBAC
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: Global analytics is restricted to superadmins' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    const subcategoryFilter = searchParams.get('subcategory');
    const sourceFilter = searchParams.get('source') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const today = new Date();
    const startOfRange = startDateParam ? startOfDay(new Date(startDateParam)) : startOfDay(today);
    const endOfRange = endDateParam ? endOfDay(new Date(endDateParam)) : endOfDay(today);
    
    const trendEndDate = endOfRange;
    const trendStartDate = startOfDay(subDays(trendEndDate, 6));

    // Helper to apply filters
    const applyFilters = (query: any, isWb: boolean = true) => {
      if (categoryFilter) {
        query = query.whereRaw('LOWER(grain_category) = LOWER(?)', [categoryFilter]);
      }
      if (subcategoryFilter) {
        query = query.whereRaw('LOWER(subcategory) = LOWER(?)', [subcategoryFilter]);
      }
      if (sourceFilter === 'weighbridge' && !isWb) query = query.whereRaw('1 = 0');
      if (sourceFilter === 'small_scale' && isWb) query = query.whereRaw('1 = 0');
      return query;
    };

    // 1. Unified Concurrent Fetch for Global Analytics
    const groupByField = categoryFilter ? 'subcategory' : 'grain_category';

    const [
      branchesCount,
      farmersCount,
      wbKpis,
      ssKpis,
      trendWbVolume,
      trendSsRaw,
      splitInWb,
      splitInSs,
      splitOutWb,
      splitOutSs,
      branchPerformanceRaw,
      recentSlips
    ] = await Promise.all([
      db('branches').count('id as count').first(),
      db('farmers').count('id as count').first(),

      // A. Weighbridge KPIs (includes Stock In, Stock Out, All-Time sum, Today sum, Vehicles count, Pending, Rates sum)
      applyFilters(
        db('weighbridge_slips')
      ).select(
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN net_weight ELSE 0 END) as stock_in_sum", [startOfRange, endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'OUT' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN net_weight ELSE 0 END) as stock_out_sum", [startOfRange, endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND is_internal = true AND created_at <= ? THEN net_weight ELSE 0 END) as lifetime_stock_in_sum", [endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'OUT' AND is_internal = true AND created_at <= ? THEN net_weight ELSE 0 END) as lifetime_stock_out_sum", [endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND is_internal = true THEN payable_amount ELSE 0 END) as all_time_payable_sum"),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN payable_amount ELSE 0 END) as today_purchase_sum", [startOfRange, endOfRange]),
        db.raw("COUNT(CASE WHEN status = 'APPROVED' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN 1 END) as today_vehicles_count", [startOfRange, endOfRange]),
        db.raw("COUNT(CASE WHEN status = 'PENDING' AND is_internal = true THEN 1 END) as pending_count"),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN rate_per_mt ELSE 0 END) as rate_sum", [startOfRange, endOfRange])
      ).first(),

      // B. Small Scale KPIs (includes Stock In, Stock Out, All-Time sum, Today sum, Pending, Rates sum)
      applyFilters(
        db('small_scale_entries'),
        false
      ).select(
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND created_at >= ? AND created_at <= ? THEN total_weight ELSE 0 END) as stock_in_sum", [startOfRange, endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'OUT' AND created_at >= ? AND created_at <= ? THEN total_weight ELSE 0 END) as stock_out_sum", [startOfRange, endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND created_at <= ? THEN total_weight ELSE 0 END) as lifetime_stock_in_sum", [endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'OUT' AND created_at <= ? THEN total_weight ELSE 0 END) as lifetime_stock_out_sum", [endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' THEN total_amount ELSE 0 END) as all_time_payable_sum"),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND created_at >= ? AND created_at <= ? THEN total_amount ELSE 0 END) as today_purchase_sum", [startOfRange, endOfRange]),
        db.raw("COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count"),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND created_at >= ? AND created_at <= ? THEN price_per_unit ELSE 0 END) as rate_sum", [startOfRange, endOfRange])
      ).first(),

      // C. Purchase Trend WB
      applyFilters(
        db('weighbridge_slips')
          .where({ status: 'APPROVED', entry_type: 'IN', is_internal: true })
          .where('created_at', '>=', trendStartDate)
          .where('created_at', '<=', trendEndDate)
      ).select(db.raw('DATE(created_at) as date'))
        .sum('net_weight as volume')
        .sum('rate_per_mt as rate_sum')
        .groupBy('date'),

      // D. Purchase Trend SS
      applyFilters(
        db('small_scale_entries')
          .where({ status: 'APPROVED', entry_type: 'IN' })
          .where('created_at', '>=', trendStartDate)
          .where('created_at', '<=', trendEndDate),
        false
      ).select(db.raw('DATE(created_at) as date'))
        .sum('total_weight as volume')
        .sum('price_per_unit as rate_sum')
        .groupBy('date'),

      // E. Splits In WB
      applyFilters(
        db('weighbridge_slips')
          .where({ status: 'APPROVED', entry_type: 'IN', is_internal: true })
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).select(`${groupByField} as name`).sum('net_weight as value').sum('payable_amount as amount_sum').groupBy(groupByField),

      // F. Splits In SS
      applyFilters(
        db('small_scale_entries')
          .where({ status: 'APPROVED', entry_type: 'IN' })
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).select(`${groupByField} as name`).sum('total_weight as value').sum('total_amount as amount_sum').groupBy(groupByField),

      // G. Splits Out WB
      applyFilters(
        db('weighbridge_slips')
          .where({ status: 'APPROVED', entry_type: 'OUT', is_internal: true })
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).select(`${groupByField} as name`).sum('net_weight as value').groupBy(groupByField),

      // H. Splits Out SS
      applyFilters(
        db('small_scale_entries')
          .where({ status: 'APPROVED', entry_type: 'OUT' })
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).select(`${groupByField} as name`).sum('total_weight as value').groupBy(groupByField),

      // I. Branch Performance
      applyFilters(
        db('weighbridge_slips')
          .join('branches', 'weighbridge_slips.branch_id', 'branches.id')
          .where({ 'weighbridge_slips.status': 'APPROVED', 'weighbridge_slips.entry_type': 'IN', 'weighbridge_slips.is_internal': true })
      ).select('branches.name').sum('weighbridge_slips.net_weight as volume').groupBy('branches.name').orderBy('volume', 'desc').limit(5),

      // J. Recent Global Slips
      applyFilters(
        db('weighbridge_slips')
          .leftJoin('farmers', 'weighbridge_slips.farmer_id', 'farmers.id')
          .leftJoin('branches', 'weighbridge_slips.branch_id', 'branches.id')
          .where('weighbridge_slips.status', 'APPROVED')
          .where('weighbridge_slips.is_internal', true)
      ).select(
          'weighbridge_slips.*',
          'farmers.name as farmer_name',
          'farmers.village as farmer_village',
          'branches.name as branch_name'
        )
        .orderBy('weighbridge_slips.created_at', 'desc')
        .limit(10)
    ]);

    const todayInWeight = (parseFloat(wbKpis?.stock_in_sum as string || '0') + parseFloat(ssKpis?.stock_in_sum as string || '0')) / 100;
    const todayOutWeight = (parseFloat(wbKpis?.stock_out_sum as string || '0') + parseFloat(ssKpis?.stock_out_sum as string || '0')) / 100;
    const totalStock = todayInWeight - todayOutWeight;
    
    const lifetimeInWeight = (parseFloat(wbKpis?.lifetime_stock_in_sum as string || '0') + parseFloat(ssKpis?.lifetime_stock_in_sum as string || '0')) / 100;
    const lifetimeOutWeight = (parseFloat(wbKpis?.lifetime_stock_out_sum as string || '0') + parseFloat(ssKpis?.lifetime_stock_out_sum as string || '0')) / 100;
    const lifetimeStock = lifetimeInWeight - lifetimeOutWeight;

    const todayPurchase = (parseFloat(wbKpis?.today_purchase_sum as string || '0')) + (parseFloat(ssKpis?.today_purchase_sum as string || '0'));
    const totalRateSum = (parseFloat(wbKpis?.rate_sum as string || '0')) + (parseFloat(ssKpis?.rate_sum as string || '0'));
    const avgPurchaseRate = todayInWeight > 0 ? (totalRateSum / todayInWeight) : 0;

    const trendData = [];
    const avgRateTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(trendEndDate, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayName = format(d, 'EEE');
      
      const wbVol = trendWbVolume.find((r: any) => format(new Date(r.date), 'yyyy-MM-dd') === dateStr);
      const ssMatch = trendSsRaw.find((r: any) => format(new Date(r.date), 'yyyy-MM-dd') === dateStr);

      const dayVolume = (parseFloat(wbVol?.volume || '0') + parseFloat(ssMatch?.volume || '0')) / 100;
      const dayRateSum = parseFloat(wbVol?.rate_sum || '0') + parseFloat(ssMatch?.rate_sum || '0');
      
      trendData.push({ name: dayName, purchase: dayVolume });
      avgRateTrend.push({ name: dayName, rate: dayVolume > 0 ? (dayRateSum / dayVolume) : 0 });
    }

    // Category/Subcategory Split
    const allNames = new Set([
      ...splitInWb.map((c: any) => c.name),
      ...splitInSs.map((c: any) => c.name),
      ...splitOutWb.map((c: any) => c.name),
      ...splitOutSs.map((c: any) => c.name)
    ]);
    const categorySplit = Array.from(allNames).map((name: any) => {
      if (!name) return null;
      const wbIn = parseFloat(splitInWb.find((c: any) => c.name === name)?.value || '0');
      const ssIn = parseFloat(splitInSs.find((c: any) => c.name === name)?.value || '0');
      const wbOut = parseFloat(splitOutWb.find((c: any) => c.name === name)?.value || '0');
      const ssOut = parseFloat(splitOutSs.find((c: any) => c.name === name)?.value || '0');
      const val = (wbIn + ssIn - wbOut - ssOut) / 100;
      return { name, value: val > 0 ? val : 0 };
    }).filter((item: any) => item && item.value > 0);

    const sourceSplit = [
      { name: 'Weighbridge', value: splitInWb.reduce((acc: number, c: any) => acc + parseFloat(c.value || '0'), 0) / 100 },
      { name: 'Small Scale', value: splitInSs.reduce((acc: number, c: any) => acc + parseFloat(c.value || '0'), 0) / 100 }
    ].filter((s: any) => s.value > 0);

    const avgRateSplit = Array.from(allNames).map((name: any) => {
      if (!name) return null;
      const weight = (parseFloat(splitInWb.find((c: any) => c.name === name)?.value || '0') + parseFloat(splitInSs.find((c: any) => c.name === name)?.value || '0')) / 100;
      const amountSum = parseFloat(splitInWb.find((c: any) => c.name === name)?.amount_sum || '0') + parseFloat(splitInSs.find((c: any) => c.name === name)?.amount_sum || '0');
      return { name, value: weight > 0 ? (amountSum / weight) : 0 };
    }).filter(Boolean);

    const purchaseSplit = Array.from(allNames).map((name: any) => {
      if (!name) return null;
      const amountSum = parseFloat(splitInWb.find((c: any) => c.name === name)?.amount_sum || '0') + parseFloat(splitInSs.find((c: any) => c.name === name)?.amount_sum || '0');
      return { name, value: amountSum };
    }).filter((item: any) => item && item.value > 0);

    const responseData = {
      globalKpis: { 
        branches: parseInt(branchesCount?.count as string || '0'), 
        farmers: parseInt(farmersCount?.count as string || '0'), 
        totalWeight: todayInWeight, 
        totalAmount: (parseFloat(wbKpis?.all_time_payable_sum as string || '0') + parseFloat(ssKpis?.all_time_payable_sum as string || '0')) 
      },
      kpis: { 
        todayPurchase, 
        todayVehicles: parseInt(wbKpis?.today_vehicles_count as string || '0'), 
        pendingSlips: parseInt(wbKpis?.pending_count as string || '0') + parseInt(ssKpis?.pending_count as string || '0'), 
        totalStock, 
        lifetimeStock,
        todayWeight: todayInWeight,
        avgPurchaseRate 
      },
      trendData,
      avgRateTrend,
      categorySplit,
      sourceSplit,
      avgRateSplit,
      purchaseSplit,
      branchPerformance: branchPerformanceRaw.map((b: any) => ({ name: b.name, volume: parseFloat(b.volume as string || '0') / 100 })),
      recentSlips
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Global Analytics API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
