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
    const branchId = searchParams.get('branchId');
    const categoryFilter = searchParams.get('category');
    const subcategoryFilter = searchParams.get('subcategory');
    const sourceFilter = searchParams.get('source') || 'all'; // all, weighbridge, small_scale
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!branchId) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });
    }

    // Caching Key based on query params
    const cacheKey = JSON.stringify({
      branchId,
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
    
    // For trends, we usually show 7 days up to the endOfRange
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
      if (sourceFilter === 'weighbridge' && !isWb) {
        query = query.whereRaw('1 = 0'); // Empty result for small scale if we only want WB
      }
      if (sourceFilter === 'small_scale' && isWb) {
        query = query.whereRaw('1 = 0'); // Empty result for WB if we only want SS
      }
      return query;
    };

    // 1. KPI Data
    const [
      todayPurchaseWeighbridge,
      todayPurchaseSmallScale,
      todayVehicles,
      pendingSlipsCount,
      pendingSmallScaleCount,
      stockInWeighbridge,
      stockInSmallScale,
      stockOutWeighbridge,
      stockOutSmallScale,
      todayRateWeighbridge,
      todayRateSmallScale
    ] = await Promise.all([
      // Filtered Purchase Amount (ONLY Approved Internal IN entries in date range)
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .where('is_internal', true)
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).sum('payable_amount as sum').first(),
      
      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).sum('total_amount as sum').first(),

      // Filtered Vehicles (ONLY Approved Internal slips created in date range)
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('is_internal', true)
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).count('id as count').first(),

      // Pending Slips (Internal)
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'PENDING')
          .where('is_internal', true)
      ).count('id as count').first(),

      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId)
          .where('status', 'PENDING'),
        false
      ).count('id as count').first(),

      // Filtered Stock IN / Filtered Purchase Weight (ONLY Approved Internal in date range)
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .where('is_internal', true)
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).sum('net_weight as sum').first(),
      
      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).sum('total_weight as sum').first(),
      
      // Filtered Stock OUT (ONLY Approved Internal in date range)
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'OUT')
          .where('is_internal', true)
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).sum('net_weight as sum').first(),

      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'OUT')
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).sum('total_weight as sum').first(),

      // Filtered Sum of Rates specifically for Average Rate calculation
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .where('is_internal', true)
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).sum('rate_per_mt as sum').first(),

      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).sum('price_per_unit as sum').first()
    ]);

    const totalInWeight = (parseFloat(stockInWeighbridge?.sum as string || '0') + parseFloat(stockInSmallScale?.sum as string || '0')) / 100;
    const totalOutWeight = (parseFloat(stockOutWeighbridge?.sum as string || '0') + parseFloat(stockOutSmallScale?.sum as string || '0')) / 100;
    const totalStock = totalInWeight - totalOutWeight;

    const totalPurchaseAmount = (parseFloat(todayPurchaseWeighbridge?.sum as string || '0')) + (parseFloat(todayPurchaseSmallScale?.sum as string || '0'));
    const avgPurchaseRate = totalInWeight > 0 ? (totalPurchaseAmount / totalInWeight) : 0;

    // 2. Purchase Trend (Last 7 Days from endOfRange)
    const trendWeighbridgeRaw = await applyFilters(
      db('weighbridge_slips')
        .where('status', 'APPROVED')
        .where('entry_type', 'IN')
        .where('is_internal', true)
        .where('created_at', '>=', trendStartDate)
        .where('created_at', '<=', trendEndDate)
    ).select(db.raw('DATE(created_at) as date'))
      .sum('net_weight as volume')
      .sum('payable_amount as amount_sum')
      .groupBy('date');

    const trendSmallScaleRaw = await applyFilters(
      db('small_scale_entries')
        .where('branch_id', branchId)
        .where('status', 'APPROVED')
        .where('entry_type', 'IN')
        .where('created_at', '>=', trendStartDate)
        .where('created_at', '<=', trendEndDate),
      false
    ).select(db.raw('DATE(created_at) as date'))
      .sum('total_weight as volume')
      .sum('total_amount as amount_sum')
      .groupBy('date');

    // Fill in missing days for trend
    const trendData = [];
    const avgRateTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(trendEndDate, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayName = format(d, 'EEE');
      
      const wbMatch = trendWeighbridgeRaw.find((r: any) => format(new Date(r.date), 'yyyy-MM-dd') === dateStr);
      const ssMatch = trendSmallScaleRaw.find((r: any) => format(new Date(r.date), 'yyyy-MM-dd') === dateStr);

      const dayVolume = (parseFloat(wbMatch?.volume || '0') + parseFloat(ssMatch?.volume || '0')) / 100;
      const dayAmountSum = parseFloat(wbMatch?.amount_sum || '0') + parseFloat(ssMatch?.amount_sum || '0');
      
      trendData.push({
        name: dayName,
        purchase: dayVolume
      });

      avgRateTrend.push({
        name: dayName,
        rate: dayVolume > 0 ? (dayAmountSum / dayVolume) : 0
      });
    }

    // 3. Category/Subcategory Split
    const groupByField = categoryFilter ? 'subcategory' : 'grain_category';

    const [splitInWb, splitInSs] = await Promise.all([
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .where('is_internal', true)
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).select(`${groupByField} as name`).sum('net_weight as value').sum('payable_amount as amount_sum').groupBy(groupByField),

      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).select(`${groupByField} as name`).sum('total_weight as value').sum('total_amount as amount_sum').groupBy(groupByField)
    ]);
    // Merge entities
    const allNames = new Set([
      ...splitInWb.map((c: any) => c.name),
      ...splitInSs.map((c: any) => c.name)
    ]);

    const categorySplit = Array.from(allNames).map((name: any) => {
      if (!name) return null;
      const wbIn = splitInWb.find((c: any) => c.name === name)?.value || 0;
      const ssIn = splitInSs.find((c: any) => c.name === name)?.value || 0;
      const val = (parseFloat(wbIn as string) + parseFloat(ssIn as string)) / 100;
      return { name, value: val > 0 ? val : 0 };
    }).filter((item: any) => item && item.value > 0);

    const sourceSplit = [
      { name: 'Weighbridge', value: splitInWb.reduce((acc: number, c: any) => acc + parseFloat(c.value || '0'), 0) / 100 },
      { name: 'Small Scale', value: splitInSs.reduce((acc: number, c: any) => acc + parseFloat(c.value || '0'), 0) / 100 }
    ].filter((s: any) => s.value > 0);

    const avgRateSplit = Array.from(allNames).map((name: any) => {
      if (!name) return null;
      const wbIn = splitInWb.find((c: any) => c.name === name)?.value || 0;
      const ssIn = splitInSs.find((c: any) => c.name === name)?.value || 0;
      const wbAmountSum = splitInWb.find((c: any) => c.name === name)?.amount_sum || 0;
      const ssAmountSum = splitInSs.find((c: any) => c.name === name)?.amount_sum || 0;
      
      const totalWeight = (parseFloat(wbIn as string) + parseFloat(ssIn as string)) / 100;
      const totalAmountSum = parseFloat(wbAmountSum as string) + parseFloat(ssAmountSum as string);
      
      return {
        name: name,
        value: totalWeight > 0 ? (totalAmountSum / totalWeight) : 0
      };
    }).filter(Boolean);

    // 4. Recent Slips
    const recentSlips = await applyFilters(
      db('weighbridge_slips')
        .leftJoin('farmers', 'weighbridge_slips.farmer_id', 'farmers.id')
        .where('weighbridge_slips.branch_id', branchId)
        .where('weighbridge_slips.status', 'APPROVED')
        .where('weighbridge_slips.is_internal', true)
    ).select(
        'weighbridge_slips.*',
        'farmers.name as farmer_name',
        'farmers.village as farmer_village'
      )
      .orderBy('weighbridge_slips.created_at', 'desc')
      .limit(5);

    const responseData = {
      kpis: {
        todayPurchase: parseFloat(todayPurchaseWeighbridge?.sum as string || '0') + parseFloat(todayPurchaseSmallScale?.sum as string || '0'),
        todayVehicles: parseInt(todayVehicles?.count as string || '0'),
        pendingSlips: parseInt(pendingSlipsCount?.count as string || '0') + parseInt(pendingSmallScaleCount?.count as string || '0'),
        totalStock: totalStock,
        todayWeight: totalInWeight,
        avgPurchaseRate
      },
      trendData,
      avgRateTrend,
      categorySplit,
      sourceSplit,
      avgRateSplit,
      recentSlips
    };

    cache.set(cacheKey, {
      data: responseData,
      timestamp: now
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
