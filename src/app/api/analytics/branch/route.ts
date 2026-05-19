import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { analyticsCache } from '@/lib/analytics-cache';

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
    const cached = analyticsCache.get(cacheKey);
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

    // 1. Unified Concurrent Fetch for KPIs, Trends, Splits, and Recent Slips
    const groupByField = categoryFilter ? 'subcategory' : 'grain_category';

    const [
      wbKpis,
      ssKpis,
      trendWeighbridgeRaw,
      trendSmallScaleRaw,
      splitInWb,
      splitInSs,
      splitOutWb,
      splitOutSs,
      recentSlips
    ] = await Promise.all([
      // A. Weighbridge KPIs
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
      ).select(
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN payable_amount ELSE 0 END) as today_purchase_sum", [startOfRange, endOfRange]),
        db.raw("COUNT(CASE WHEN status = 'APPROVED' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN 1 END) as today_vehicles_count", [startOfRange, endOfRange]),
        db.raw("COUNT(CASE WHEN status = 'PENDING' AND is_internal = true THEN 1 END) as pending_count"),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN net_weight ELSE 0 END) as stock_in_sum", [startOfRange, endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'OUT' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN net_weight ELSE 0 END) as stock_out_sum", [startOfRange, endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND is_internal = true AND created_at >= ? AND created_at <= ? THEN rate_per_mt ELSE 0 END) as rate_sum", [startOfRange, endOfRange])
      ).first(),

      // B. Small Scale KPIs
      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId),
        false
      ).select(
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND created_at >= ? AND created_at <= ? THEN total_amount ELSE 0 END) as today_purchase_sum", [startOfRange, endOfRange]),
        db.raw("COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count"),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND created_at >= ? AND created_at <= ? THEN total_weight ELSE 0 END) as stock_in_sum", [startOfRange, endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'OUT' AND created_at >= ? AND created_at <= ? THEN total_weight ELSE 0 END) as stock_out_sum", [startOfRange, endOfRange]),
        db.raw("SUM(CASE WHEN status = 'APPROVED' AND entry_type = 'IN' AND created_at >= ? AND created_at <= ? THEN price_per_unit ELSE 0 END) as rate_sum", [startOfRange, endOfRange])
      ).first(),

      // C. Purchase Trend WB
      applyFilters(
        db('weighbridge_slips')
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .where('is_internal', true)
          .where('created_at', '>=', trendStartDate)
          .where('created_at', '<=', trendEndDate)
      ).select(db.raw('DATE(created_at) as date'))
        .sum('net_weight as volume')
        .sum('payable_amount as amount_sum')
        .groupBy('date'),

      // D. Purchase Trend SS
      applyFilters(
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
        .groupBy('date'),

      // E. Splits In WB
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .where('is_internal', true)
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).select(`${groupByField} as name`).sum('net_weight as value').sum('payable_amount as amount_sum').groupBy(groupByField),

      // F. Splits In SS
      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'IN')
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).select(`${groupByField} as name`).sum('total_weight as value').sum('total_amount as amount_sum').groupBy(groupByField),

      // G. Splits Out WB
      applyFilters(
        db('weighbridge_slips')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'OUT')
          .where('is_internal', true)
          .whereBetween('created_at', [startOfRange, endOfRange])
      ).select(`${groupByField} as name`).sum('net_weight as value').groupBy(groupByField),

      // H. Splits Out SS
      applyFilters(
        db('small_scale_entries')
          .where('branch_id', branchId)
          .where('status', 'APPROVED')
          .where('entry_type', 'OUT')
          .whereBetween('created_at', [startOfRange, endOfRange]),
        false
      ).select(`${groupByField} as name`).sum('total_weight as value').groupBy(groupByField),

      // I. Recent Slips
      applyFilters(
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
        .limit(5)
    ]);

    const totalInWeight = (parseFloat(wbKpis?.stock_in_sum as string || '0') + parseFloat(ssKpis?.stock_in_sum as string || '0')) / 100;
    const totalOutWeight = (parseFloat(wbKpis?.stock_out_sum as string || '0') + parseFloat(ssKpis?.stock_out_sum as string || '0')) / 100;
    const totalStock = totalInWeight - totalOutWeight;

    const totalPurchaseAmount = (parseFloat(wbKpis?.today_purchase_sum as string || '0')) + (parseFloat(ssKpis?.today_purchase_sum as string || '0'));
    const avgPurchaseRate = totalInWeight > 0 ? (totalPurchaseAmount / totalInWeight) : 0;

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

    // Merge entities
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

    const responseData = {
      kpis: {
        todayPurchase: parseFloat(wbKpis?.today_purchase_sum as string || '0') + parseFloat(ssKpis?.today_purchase_sum as string || '0'),
        todayVehicles: parseInt(wbKpis?.today_vehicles_count as string || '0'),
        pendingSlips: parseInt(wbKpis?.pending_count as string || '0') + parseInt(ssKpis?.pending_count as string || '0'),
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

    analyticsCache.set(cacheKey, {
      data: responseData,
      timestamp: now
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
