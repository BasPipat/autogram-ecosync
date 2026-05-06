import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Location } from '@/models/Location';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

function normalizeLocationRow(row: any) {
  return {
    name: String(row.name || row['ชื่อสถานที่'] || row['location'] || row['Location'] || row['location name'] || '').trim(),
    locationLink: String(row.locationLink || row['locationLink'] || row['ลิงก์พิกัด'] || row['location link'] || row['mapUrl'] || row['MapLink'] || row['Map Link'] || '').trim(),
    contactPerson: String(row.contactPerson || row['contactPerson'] || row['ผู้ติดต่อ'] || row['Contact Person'] || '').trim(),
    phoneNumber: String(row.phoneNumber || row['phoneNumber'] || row['เบอร์โทรศัพท์'] || row['Phone Number'] || row['Phone'] || '').trim(),
    companyId: row.companyId ? String(row.companyId).trim() : undefined,
  };
}

export async function GET(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  let query = {};
  if (!isInternalRole(token.role)) {
    try {
      query = { companyId: new ObjectId(token.companyId) };
    } catch {
      return NextResponse.json({ locations: [] }); // return empty gracefully if companyId invalid
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
      locationLink: row.locationLink,
      contactPerson: row.contactPerson || '',
      phoneNumber: row.phoneNumber || '',
    };

    if (!isInternalRole(token.role)) {
      location.companyId = new ObjectId(token.companyId);
    } else {
      if (row.companyId) {
        try {
          location.companyId = new ObjectId(row.companyId);
        } catch {
          throw new Error('companyId ไม่ถูกต้อง');
        }
      } else {
        return null;
      }
    }

    return location;
  });

  if (prepared.some((item: any) => item === null)) {
    return NextResponse.json({ error: 'สำหรับ System Owner ต้องระบุ companyId ในไฟล์ Excel หรือข้อมูล' }, { status: 400 });
  }

  const invalidRows = prepared
    .map((item: any, index: number) => ({ item, index }))
    .filter(({ item }: any) => !item?.name || !item?.locationLink);

  if (invalidRows.length > 0) {
    return NextResponse.json({ error: `พบข้อมูลไม่ครบถ้วนในแถวที่ ${invalidRows.map((r: any) => r.index + 2).join(', ')}` }, { status: 400 });
  }

  try {
    const result = await Location.insertMany(prepared as any, { ordered: false });
    return NextResponse.json({ message: 'นำเข้าข้อมูลสถานที่สำเร็จ', count: result.length, locations: result });
  } catch (error: unknown) {
    console.error('Location import error', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสถานที่' }, { status: 500 });
  }
}
