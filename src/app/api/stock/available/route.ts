import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const category = searchParams.get('category');

    if (!branchId || !category) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const [stockInWb, stockInSs, stockOutWb, stockOutSs] = await Promise.all([
      db('weighbridge_slips')
        .where({ 
          branch_id: branchId, 
          grain_category: category, 
          status: 'APPROVED', 
          entry_type: 'IN', 
          is_internal: true 
        })
        .sum('net_weight as sum')
        .first(),
      
      db('small_scale_entries')
        .where({ 
          branch_id: branchId, 
          grain_category: category, 
          status: 'APPROVED', 
          entry_type: 'IN'
        })
        .sum('total_weight as sum')
        .first(),
      
      db('weighbridge_slips')
        .where({ 
          branch_id: branchId, 
          grain_category: category, 
          status: 'APPROVED', 
          entry_type: 'OUT', 
          is_internal: true 
        })
        .sum('net_weight as sum')
        .first(),

      db('small_scale_entries')
        .where({ 
          branch_id: branchId, 
          grain_category: category, 
          status: 'APPROVED', 
          entry_type: 'OUT'
        })
        .sum('total_weight as sum')
        .first()
    ]);
    
    const available = (
      (parseFloat(stockInWb?.sum as string || '0') + parseFloat(stockInSs?.sum as string || '0')) - 
      (parseFloat(stockOutWb?.sum as string || '0') + parseFloat(stockOutSs?.sum as string || '0'))
    );

    return NextResponse.json({ 
      available: available > 0 ? available : 0,
      unit: 'KG'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
