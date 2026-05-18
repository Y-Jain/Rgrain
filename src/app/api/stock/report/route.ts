import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!branchId) {
      return NextResponse.json({ error: 'Missing branchId' }, { status: 400 });
    }

    const buildQuery = (table: string, entryType: 'IN' | 'OUT') => {
      let query = db(table).where({
        branch_id: branchId,
        status: 'APPROVED',
        entry_type: entryType
      });

      // For weighbridge, we only count internal slips for stock
      if (table === 'weighbridge_slips') {
        query = query.where('is_internal', true);
      }

      if (category && category !== 'ALL') {
        query = query.where('grain_category', category);
      }

      if (subcategory && subcategory !== 'ALL') {
        query = query.where('subcategory', subcategory);
      }

      if (startDate) {
        query = query.where('created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('created_at', '<=', `${endDate} 23:59:59`);
      }

      return query;
    };

    const [inWb, inSs, outWb, outSs] = await Promise.all([
      buildQuery('weighbridge_slips', 'IN')
        .select('grain_category', 'subcategory')
        .sum('net_weight as volume')
        .sum('payable_amount as amount')
        .groupBy('grain_category', 'subcategory'),

      buildQuery('small_scale_entries', 'IN')
        .select('grain_category', 'subcategory')
        .sum('total_weight as volume')
        .sum('total_amount as amount')
        .groupBy('grain_category', 'subcategory'),

      buildQuery('weighbridge_slips', 'OUT')
        .select('grain_category', 'subcategory')
        .sum('net_weight as volume')
        .sum('payable_amount as amount')
        .groupBy('grain_category', 'subcategory'),

      buildQuery('small_scale_entries', 'OUT')
        .select('grain_category', 'subcategory')
        .sum('total_weight as volume')
        .sum('total_amount as amount')
        .groupBy('grain_category', 'subcategory'),
    ]);

    // Aggregate results by Category | Subcategory
    const aggregated: Record<string, any> = {};

    const processResults = (rows: any[], type: 'IN' | 'OUT') => {
      rows.forEach(r => {
        const cat = r.grain_category;
        const sub = r.subcategory || 'General';
        const key = `${cat}|${sub}`;

        if (!aggregated[key]) {
          aggregated[key] = {
            category: cat,
            subcategory: sub,
            inVolume: 0,
            inAmount: 0,
            outVolume: 0,
            outAmount: 0
          };
        }

        if (type === 'IN') {
          aggregated[key].inVolume += parseFloat(r.volume || '0');
          aggregated[key].inAmount += parseFloat(r.amount || '0');
        } else {
          aggregated[key].outVolume += parseFloat(r.volume || '0');
          aggregated[key].outAmount += parseFloat(r.amount || '0');
        }
      });
    };

    processResults(inWb, 'IN');
    processResults(inSs, 'IN');
    processResults(outWb, 'OUT');
    processResults(outSs, 'OUT');

    // Fetch Expenses for the period with category breakdown
    let expenseQuery = db('ledgers')
      .where({ branch_id: branchId, ledger_type: 'EXPENSE' });

    if (startDate) {
      expenseQuery = expenseQuery.where('created_at', '>=', startDate);
    }
    if (endDate) {
      expenseQuery = expenseQuery.where('created_at', '<=', `${endDate} 23:59:59`);
    }

    const expenses = await expenseQuery.select('narration', 'debit', 'credit', 'created_at');

    // Attempt to categorize expenses from narration or use a fallback
    const expenseBreakdown: Record<string, number> = {};
    expenses.forEach(e => {
      let cat = "Other";
      if (e.narration.includes("Salary")) cat = "Salary";
      else if (e.narration.includes("Rent")) cat = "Rent";
      else if (e.narration.includes("Electricity")) cat = "Electricity";
      else if (e.narration.includes("Maintenance")) cat = "Maintenance";
      else if (e.narration.includes("Transport")) cat = "Transport";

      const amount = parseFloat(e.debit || '0') - parseFloat(e.credit || '0');
      expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amount;
    });

    const totalExpenses = Object.values(expenseBreakdown).reduce((a, b) => a + b, 0);

    const breakdown = Object.values(aggregated).map(item => {
      const inQtl = item.inVolume / 100;
      const outQtl = item.outVolume / 100;
      const inVal = item.inAmount;
      const outVal = item.outAmount;

      const inAvgRate = inQtl > 0 ? inVal / inQtl : 0;
      const outAvgRate = outQtl > 0 ? outVal / outQtl : 0;

      return {
        ...item,
        inVolume: inQtl,
        outVolume: outQtl,
        inAvgRate,
        outAvgRate,
        netStock: inQtl - outQtl,
        profit: outQtl > 0 ? (outAvgRate - inAvgRate) * outQtl : 0
      };
    });

    const summary = breakdown.reduce((acc, curr) => ({
      totalInWeight: acc.totalInWeight + curr.inVolume,
      totalInAmount: acc.totalInAmount + curr.inAmount,
      totalOutWeight: acc.totalOutWeight + curr.outVolume,
      totalOutAmount: acc.totalOutAmount + curr.outAmount,
      totalProfit: acc.totalProfit + (curr.profit || 0)
    }), { totalInWeight: 0, totalInAmount: 0, totalOutWeight: 0, totalOutAmount: 0, totalProfit: 0 });

    const grossProfit = summary.totalProfit;

    const finalSummary = {
      ...summary,
      avgInRate: summary.totalInWeight > 0 ? summary.totalInAmount / summary.totalInWeight : 0,
      avgOutRate: summary.totalOutWeight > 0 ? summary.totalOutAmount / summary.totalOutWeight : 0,
      netStock: summary.totalInWeight - summary.totalOutWeight,
      totalExpenses,
      grossProfit,
      netProfit: grossProfit - totalExpenses
    };

    return NextResponse.json({
      summary: finalSummary,
      breakdown: breakdown.sort((a, b) => a.category.localeCompare(b.category)),
      expenseBreakdown: Object.entries(expenseBreakdown).map(([name, value]) => ({ name, value }))
    });

  } catch (error: any) {
    console.error("Stock Report API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
