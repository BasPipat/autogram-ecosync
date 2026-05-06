import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Location } from '@/models/Location';
import { getSessionToken, isInternalRole } from '@/lib/access';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

function normalizeLocationRow(row: any) {
  return {
    name: String(row.name || row['ชื่อสถานที่'] || row['location'] || row['Location'] || row['location name'] || '').trim(),
    locationLink: String(row.locationLink || row['locationLink'] || row['ลิงก์พิกัด'] || row['location link'] || row['mapUrl'] || row['MapLink'] || row['Map Link'] || '').trim(),
    contactPerson: String(row.contactPerson || row['contactPerson'] || row['ผู้ติดต่อ'] || row['Contact Person'] || '').trim(),
    phoneNumber: String(row.phoneNumber || row['phoneNumber'] || row['เบอร์โทรศัพท์'] || row['Phone Number'] || row['Phone'] || '').trim(),
    companyId: row.companyId ? String(row.companyId).trim() : undefined,
    companyName: row.companyName ? String(row.companyName).trim() : undefined,
  };
}

export async function GET(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  let query: Record<string, any> = {};
  if (!isInternalRole(token.role)) {
    if (token.companyId) {
      try {
        // Find by ID OR Name for maximum compatibility
        query = { 
          $or: [
            { companyId: new mongoose.Types.ObjectId(token.companyId) },
            { companyName: token.companyName }
          ]
        };
      } catch {
        query = { companyName: token.companyName };
      }
    } else if (token.companyName) {
      query = { companyName: token.companyName };
    } else {
      return NextResponse.json({ locations: [] }); 
    }
  }

  const locations = await Location.find(query).sort({ name: 1 }).lean();
  return NextResponse.json({ locations });
}

export async function POST(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  await connectToDatabase();

  const records = Array.isArray(body.records) ? body.records : [body];

  if (records.length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลสำหรับบันทึก' }, { status: 400 });
  }

  const prepared = records.map(normalizeLocationRow).map((row: any) => {
    const location: any = {
      name: row.name,
      locationLink: row.locationLink || '',
      contactPerson: row.contactPerson || '',
      phoneNumber: row.phoneNumber || '',
    };

    if (!isInternalRole(token.role)) {
      if (token.companyId) {
        try { location.companyId = new mongoose.Types.ObjectId(token.companyId); } catch {}
      }
      location.companyName = token.companyName;
    } else {
      if (row.companyId) {
        try {
          location.companyId = new mongoose.Types.ObjectId(row.companyId);
        } catch {}
      }
      if (row.companyName) {
        location.companyName = row.companyName;
      }
      
      if (!location.companyId && !location.companyName) {
        return null;
      }
    }

    return location;
  }).filter((item: any) => item !== null);

  if (prepared.length === 0 && isInternalRole(token.role)) {
    return NextResponse.json({ error: 'สำหรับ System Owner ต้องระบุบริษัท (ID หรือ Name)' }, { status: 400 });
  }

  try {
    for (const record of prepared) {
      const filter: any = { name: record.name.trim() };
      if (record.companyId) filter.companyId = record.companyId;
      else filter.companyName = record.companyName;

      await Location.findOneAndUpdate(
        filter,
        { $set: record },
        { upsert: true, new: true }
      );
    }
    
    return NextResponse.json({ message: 'บันทึกข้อมูลสถานที่สำเร็จ', count: prepared.length });
  } catch (error: unknown) {
    console.error('Location import error', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสถานที่' }, { status: 500 });
  }
}
