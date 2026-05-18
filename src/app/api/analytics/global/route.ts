import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 120000; // 2 minutes in milliseconds

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    const subcategoryFilter = searchParams.get('subcategory');
    const sourceFilter = searchParams.get('source') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Caching Key based on query params
    const cacheKey = JSON.stringify({
      categoryFilter,
      subcategoryFilter,
      sourceFilter,
      startDateParam,
      endDateParam
    });

    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

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

    const [
      branchesCount,
      farmersCount,
      stockInWb,
      stockInSs,
      stockOutWb,
      stockOutSs,
      amountWb,
      amountSs,
      todayPurchaseWb,
      todayPurchaseSs,
      todayVehicles,
      pendingSlipsWb,
      pendingSlipsSs,
      todayRateWb,
      todayRateSs
    ] = await Promise.all([
      db('branches').count('id as count').first(),
      db('farmers').count('id as count').first(),
      
      // Filtered Stock IN / Filtered Purchase Weight (ONLY Approved Internal in date range)
      applyFilters(db('weighbridge_slips').where({ status: 'APPROVED', entry_type: 'IN', is_internal: true }).whereBetween('created_at', [startOfRange, endOfRange])).sum('net_weight as sum').first(),
      applyFilters(db('small_scale_entries').where({ status: 'APPROVED', entry_type: 'IN' }).whereBetween('created_at', [startOfRange, endOfRange]), false).sum('total_weight as sum').first(),
      
      // Filtered Stock OUT (ONLY Approved Internal in date range)
      applyFilters(db('weighbridge_slips').where({ status: 'APPROVED', entry_type: 'OUT', is_internal: true }).whereBetween('created_at', [startOfRange, endOfRange])).sum('net_weight as sum').first(),
      applyFilters(db('small_scale_entries').where({ status: 'APPROVED', entry_type: 'OUT' }).whereBetween('created_at', [startOfRange, endOfRange]), false).sum('total_weight as sum').first(),
      
      // Amount (All Time Approved Internal)
      applyFilters(db('weighbridge_slips').where({ status: 'APPROVED', entry_type: 'IN', is_internal: true })).sum('payable_amount as sum').first(),
      applyFilters(db('small_scale_entries').where({ status: 'APPROVED', entry_type: 'IN' }), false).sum('total_amount as sum').first(),

      // Filtered Purchase Amount (ONLY Approved Internal IN entries in date range)
      applyFilters(db('weighbridge_slips').where({ status: 'APPROVED', entry_type: 'IN', is_internal: true }).whereBetween('created_at', [startOfRange, endOfRange])).sum('payable_amount as sum').first(),
      applyFilters(db('small_scale_entries').where({ status: 'APPROVED', entry_type: 'IN' }).whereBetween('created_at', [startOfRange, endOfRange]), false).sum('total_amount as sum').first(),

      // Filtered Vehicles (ONLY Approved Internal slips created in date range)
      applyFilters(db('weighbridge_slips').where({ status: 'APPROVED', is_internal: true }).whereBetween('created_at', [startOfRange, endOfRange])).count('id as count').first(),
      
      // Pending Slips (Internal)
      applyFilters(db('weighbridge_slips').where({ status: 'PENDING', is_internal: true })).count('id as count').first(),
      applyFilters(db('small_scale_entries').where('status', 'PENDING'), false).count('id as count').first(),

      // Filtered Sum of Rates specifically for Average Rate calculation
      applyFilters(db('weighbridge_slips').where({ status: 'APPROVED', entry_type: 'IN', is_internal: true }).whereBetween('created_at', [startOfRange, endOfRange])).sum('rate_per_mt as sum').first(),
      applyFilters(db('small_scale_entries').where({ status: 'APPROVED', entry_type: 'IN' }).whereBetween('created_at', [startOfRange, endOfRange]), false).sum('price_per_unit as sum').first()
    ]);

    const todayInWeight = (parseFloat(stockInWb?.sum as string || '0') + parseFloat(stockInSs?.sum as string || '0')) / 100;
    const todayOutWeight = (parseFloat(stockOutWb?.sum as string || '0') + parseFloat(stockOutSs?.sum as string || '0')) / 100;
    const totalStock = todayInWeight - todayOutWeight;
    
    const todayPurchase = (parseFloat(todayPurchaseWb?.sum as string || '0')) + (parseFloat(todayPurchaseSs?.sum as string || '0'));
    const totalRateSum = (parseFloat(todayRateWb?.sum as string || '0')) + (parseFloat(todayRateSs?.sum as string || '0'));
    const avgPurchaseRate = todayInWeight > 0 ? (totalRateSum / todayInWeight) : 0;

    // Trend Data (Last 7 Days)
    const [trendWbVolume, trendSsRaw] = await Promise.all([
      applyFilters(db('weighbridge_slips').where({ status: 'APPROVED', entry_type: 'IN', is_internal: true }).where('created_at', '>=', trendStartDate).where('created_at', '<=', trendEndDate)).select(db.raw('DATE(created_at) as date')).sum('net_weight as volume').sum('rate_per_mt as rate_sum').groupBy('date'),
      applyFilters(db('small_scale_entries').where({ status: 'APPROVED', entry_type: 'IN' }).where('created_at', '>=', trendStartDate).where('created_at', '<=', trendEndDate), false).select(db.raw('DATE(created_at) as date')).sum('total_weight as volume').sum('price_per_unit as rate_sum').groupBy('date')
    ]);

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
    const groupByField = categoryFilter ? 'subcategory' : 'grain_category';
    const [splitInWb, splitInSs] = await Promise.all([
      applyFilters(db('weighbridge_slips').where({ status: 'APPROVED', entry_type: 'IN', is_internal: true }).whereBetween('created_at', [startOfRange, endOfRange])).select(`${groupByField} as name`).sum('net_weight as value').sum('rate_per_mt as rate_sum').groupBy(groupByField),
      applyFilters(db('small_scale_entries').where({ status: 'APPROVED', entry_type: 'IN' }).whereBetween('created_at', [startOfRange, endOfRange]), false).select(`${groupByField} as name`).sum('total_weight as value').sum('price_per_unit as rate_sum').groupBy(groupByField)
    ]);

    const allNames = new Set([...splitInWb.map((c: any) => c.name), ...splitInSs.map((c: any) => c.name)]);
    const categorySplit = Array.from(allNames).map((name: any) => {
      if (!name) return null;
      const val = (parseFloat(splitInWb.find((c: any) => c.name === name)?.value || '0') + parseFloat(splitInSs.find((c: any) => c.name === name)?.value || '0')) / 100;
      return { name, value: val > 0 ? val : 0 };
    }).filter((item: any) => item && item.value > 0);

    const sourceSplit = [
      { name: 'Weighbridge', value: splitInWb.reduce((acc: number, c: any) => acc + parseFloat(c.value || '0'), 0) / 100 },
      { name: 'Small Scale', value: splitInSs.reduce((acc: number, c: any) => acc + parseFloat(c.value || '0'), 0) / 100 }
    ].filter((s: any) => s.value > 0);

    const avgRateSplit = Array.from(allNames).map((name: any) => {
      if (!name) return null;
      const weight = (parseFloat(splitInWb.find((c: any) => c.name === name)?.value || '0') + parseFloat(splitInSs.find((c: any) => c.name === name)?.value || '0')) / 100;
      const rateSum = parseFloat(splitInWb.find((c: any) => c.name === name)?.rate_sum || '0') + parseFloat(splitInSs.find((c: any) => c.name === name)?.rate_sum || '0');
      return { name, value: weight > 0 ? (rateSum / weight) : 0 };
    }).filter(Boolean);

    // Branch Performance
    const branchPerformanceRaw = await applyFilters(db('weighbridge_slips').join('branches', 'weighbridge_slips.branch_id', 'branches.id').where({ 'weighbridge_slips.status': 'APPROVED', 'weighbridge_slips.entry_type': 'IN', 'weighbridge_slips.is_internal': true })).select('branches.name').sum('weighbridge_slips.net_weight as volume').groupBy('branches.name').orderBy('volume', 'desc').limit(5);

    // Recent Global Slips
    const recentSlips = await applyFilters(
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
      .limit(10);

    const responseData = {
      globalKpis: { 
        branches: parseInt(branchesCount?.count as string || '0'), 
        farmers: parseInt(farmersCount?.count as string || '0'), 
        totalWeight: todayInWeight, 
        totalAmount: (parseFloat(amountWb?.sum || '0') + parseFloat(amountSs?.sum || '0')) 
      },
      kpis: { 
        todayPurchase, 
        todayVehicles: parseInt(todayVehicles?.count as string || '0'), 
        pendingSlips: parseInt(pendingSlipsWb?.count as string || '0') + parseInt(pendingSlipsSs?.count as string || '0'), 
        totalStock, 
        todayWeight: todayInWeight,
        avgPurchaseRate 
      },
      trendData,
      avgRateTrend,
      categorySplit,
      sourceSplit,
      avgRateSplit,
      branchPerformance: branchPerformanceRaw.map((b: any) => ({ name: b.name, volume: parseFloat(b.volume as string || '0') / 100 })),
      recentSlips
    };

    cache.set(cacheKey, {
      data: responseData,
      timestamp: now
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Global Analytics API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
