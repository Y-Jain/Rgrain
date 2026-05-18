import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const branches = await db('branches').select('*').orderBy('created_at', 'desc');
    return NextResponse.json(branches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, location, contact_person, config } = body;

    const [newBranch] = await db('branches').insert({
      name,
      location,
      contact_person,
      config: JSON.stringify(config || {}),
      is_active: true
    }).returning('*');

    return NextResponse.json(newBranch);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
