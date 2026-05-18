import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, location, contact_person, config, is_active } = body;

    const [updatedBranch] = await db('branches')
      .where({ id })
      .update({
        name,
        location,
        contact_person,
        config: typeof config === 'string' ? config : JSON.stringify(config || {}),
        is_active,
        updated_at: new Date()
      })
      .returning('*');

    if (!updatedBranch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    return NextResponse.json(updatedBranch);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check for dependencies (optional, but good practice)
    // For now, we'll just delete the branch. 
    // In a real app, you might want to prevent deletion if there are slips.
    
    await db('branches').where({ id }).delete();
    
    return NextResponse.json({ message: 'Branch deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
