import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { encryptData, decryptData, sanitizeInput } from '@/lib/security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const isMobileSearch = /^\d+$/.test(search);

    if (isMobileSearch) {
      // If searching by number, fetch all, decrypt, filter by mobile, and paginate in-memory
      const allFarmers = await db('farmers').select('*').orderBy('created_at', 'desc');
      const decrypted = allFarmers.map(f => {
        try {
          return {
            ...f,
            mobile: f.mobile ? decryptData(f.mobile) || f.mobile : f.mobile,
            aadhaar_no: f.aadhaar_no ? decryptData(f.aadhaar_no) || f.aadhaar_no : f.aadhaar_no
          };
        } catch (e) {
          return f;
        }
      });
      const filtered = decrypted.filter(f => f.mobile && f.mobile.includes(search));
      const totalCount = filtered.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginated = filtered.slice(offset, offset + limit);

      return NextResponse.json({
        data: paginated,
        totalPages,
        totalCount
      });
    } else {
      // Normal Name/Village search - fully optimized DB-level pagination & indexes!
      let baseQuery = db('farmers');
      if (search) {
        baseQuery = baseQuery.where(function() {
          this.where('name', 'ilike', `%${search}%`)
              .orWhere('village', 'ilike', `%${search}%`);
        });
      }

      const totalCountQuery = await baseQuery.clone().count('id as count').first();
      const totalCount = parseInt(totalCountQuery?.count as string || '0');
      const totalPages = Math.ceil(totalCount / limit);

      const farmers = await baseQuery
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const decryptedFarmers = farmers.map(f => {
        try {
          return {
            ...f,
            mobile: f.mobile ? decryptData(f.mobile) || f.mobile : f.mobile,
            aadhaar_no: f.aadhaar_no ? decryptData(f.aadhaar_no) || f.aadhaar_no : f.aadhaar_no
          };
        } catch (e) {
          return f;
        }
      });

      return NextResponse.json({
        data: decryptedFarmers,
        totalPages,
        totalCount
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = sanitizeInput(body.name);
    const mobile = body.mobile;
    const village = sanitizeInput(body.village);
    const district = sanitizeInput(body.district);
    const state = sanitizeInput(body.state);
    const aadhaar_no = body.aadhaar_no;

    // Encrypt sensitive data before insertion
    const [newFarmer] = await db('farmers').insert({
      name,
      mobile: encryptData(mobile),
      village,
      district,
      state,
      aadhaar_no: encryptData(aadhaar_no),
      credit_score: 0
    }).returning('*');

    // Decrypt for response
    const decryptedFarmer = {
      ...newFarmer,
      mobile: decryptData(newFarmer.mobile),
      aadhaar_no: decryptData(newFarmer.aadhaar_no)
    };

    return NextResponse.json(decryptedFarmer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
