import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encryptData, decryptData, sanitizeInput, checkRateLimit } from '@/lib/security';
import { verifyToken } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    let branchId = searchParams.get('branchId');
    const offset = (page - 1) * limit;

    // Server-side enforcement for non-superadmins
    if (payload.role !== 'superadmin' && payload.branchId) {
      branchId = payload.branchId;
    }

    if (search) {
      // Fetch recent records to perform in-memory decryption and multi-field search
      let query = db('farmers').select('*').orderBy('created_at', 'desc').limit(5000);
      if (branchId) {
        query = query.where({ branch_id: branchId });
      }
      const allFarmers = await query;
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
      
      const searchTerms = search.toLowerCase().split(' ').filter(t => t.trim());

      const filtered = decrypted.filter(f => {
        const searchableString = `${f.name || ''} ${f.village || ''} ${f.mobile || ''}`.toLowerCase();
        return searchTerms.every(term => searchableString.includes(term));
      });

      const totalCount = filtered.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginated = filtered.slice(offset, offset + limit);

      return NextResponse.json({
        data: paginated,
        totalPages,
        totalCount
      });
    } else {
      // Normal pagination when no search term
      let baseQuery = db('farmers');
      
      if (branchId) {
        baseQuery = baseQuery.where({ branch_id: branchId });
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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`farmers_post_${ip}`, 60, 60000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const name = sanitizeInput(body.name) || 'Unknown Customer';
    const mobile = body.mobile || `NA-${Date.now()}`;
    const village = sanitizeInput(body.village);
    const district = sanitizeInput(body.district);
    const state = sanitizeInput(body.state);
    const aadhaar_no = body.aadhaar_no;
    
    let branchId = body.branchId;
    if (payload.role !== 'superadmin' && payload.branchId) {
      branchId = payload.branchId;
    }

    // Encrypt sensitive data before insertion
    const [newFarmer] = await db('farmers').insert({
      name,
      mobile: encryptData(mobile),
      village,
      district,
      state,
      aadhaar_no: encryptData(aadhaar_no),
      credit_score: 0,
      branch_id: branchId || null
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
