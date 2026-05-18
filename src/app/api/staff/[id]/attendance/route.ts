import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const filterYear = searchParams.get('year');
    const filterMonth = searchParams.get('month');
    const filterDate = searchParams.get('date');
    const scope = searchParams.get('scope') || 'all';

    // Base query for stats
    let statsQuery = db('attendance').where('user_id', userId);
    let logsQuery = db('attendance').where('user_id', userId).orderBy('date', 'desc');

    if (scope === 'monthly' && filterYear && filterMonth) {
      statsQuery = statsQuery.whereRaw('EXTRACT(YEAR FROM date) = ?', [filterYear])
                             .whereRaw('EXTRACT(MONTH FROM date) = ?', [filterMonth]);
      logsQuery = logsQuery.whereRaw('EXTRACT(YEAR FROM date) = ?', [filterYear])
                           .whereRaw('EXTRACT(MONTH FROM date) = ?', [filterMonth]);
    } else if (scope === 'yearly' && filterYear) {
      statsQuery = statsQuery.whereRaw('EXTRACT(YEAR FROM date) = ?', [filterYear]);
      logsQuery = logsQuery.whereRaw('EXTRACT(YEAR FROM date) = ?', [filterYear]);
    } else if (scope === 'daily' && filterDate) {
      statsQuery = statsQuery.where('date', filterDate);
      logsQuery = logsQuery.where('date', filterDate);
    }

    const filteredStats = await statsQuery
      .select('status')
      .count('* as count')
      .groupBy('status');

    const allTimeStats = await db('attendance')
      .where('user_id', userId)
      .select('status')
      .count('* as count')
      .groupBy('status');

    const logs = await logsQuery.limit(scope === 'all' ? 50 : 100);

    return NextResponse.json({
      allTimeStats,
      filteredStats,
      logs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
