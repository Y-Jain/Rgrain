import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const date = searchParams.get('date'); // YYYY-MM-DD
    const month = searchParams.get('month'); // MM
    const year = searchParams.get('year'); // YYYY

    let query = db('attendance')
      .join('users', 'attendance.user_id', 'users.id')
      .select('attendance.*', 'users.name as user_name', 'users.email as user_email');

    if (branchId) {
      query = query.where('users.branch_id', branchId);
    }

    if (date) {
      query = query.where('attendance.date', date);
    } else if (month && year) {
      query = query.whereRaw('EXTRACT(MONTH FROM attendance.date) = ?', [month])
                   .whereRaw('EXTRACT(YEAR FROM attendance.date) = ?', [year]);
    }

    const attendance = await query.orderBy('attendance.date', 'desc');
    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attendanceRecords } = body; // Array of { user_id, date, status, remarks }

    if (!Array.isArray(attendanceRecords)) {
      throw new Error("attendanceRecords must be an array");
    }

    // Using a transaction to ensure all or nothing
    await db.transaction(async (trx) => {
      for (const record of attendanceRecords) {
        const { user_id, date, status, remarks } = record;
        
        // Upsert logic
        const existing = await trx('attendance')
          .where({ user_id, date })
          .first();

        if (existing) {
          await trx('attendance')
            .where({ id: existing.id })
            .update({ status, remarks, updated_at: db.fn.now() });
        } else {
          await trx('attendance').insert({
            user_id,
            date,
            status,
            remarks
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
