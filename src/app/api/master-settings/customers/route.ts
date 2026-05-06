import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Customer } from '@/models/Customer';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

function normalizeCustomerRow(row: any) {
  return {
    taxId: String(row.taxId || row['taxId'] || row['เลขประจำตัวผู้เสียภาษี'] || row['Tax ID'] || '').trim(),
    companyName: String(row.companyName || row['companyName'] || row['ชื่อบริษัท'] || row['Company Name'] || '').trim(),
    address: String(row.address || row['address'] || row['ที่อยู่'] || row['Address'] || '').trim(),
    email: String(row.email || row['email'] || row['อีเมล'] || row['Email'] || '').trim(),
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
      return NextResponse.json({ customers: [] });
    }
  }

  const customers = await Customer.find(query).sort({ companyName: 1 }).lean();
  return NextResponse.json({ customers });
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

  const prepared = records.map(normalizeCustomerRow).map((row: any) => {
    const customer: any = {
      taxId: row.taxId,
      companyName: row.companyName,
      address: row.address || '',
      email: row.email || '',
      phoneNumber: row.phoneNumber || '',
    };

    if (!isInternalRole(token.role)) {
      customer.companyId = new ObjectId(token.companyId);
    } else {
      if (row.companyId) {
        try {
          customer.companyId = new ObjectId(row.companyId);
        } catch {
          throw new Error('companyId ไม่ถูกต้อง');
        }
      } else {
        return null;
      }
    }

    return customer;
  });

  if (prepared.some((item: any) => item === null)) {
    return NextResponse.json({ error: 'สำหรับ System Owner ต้องระบุ companyId ในไฟล์ Excel หรือข้อมูล' }, { status: 400 });
  }

  const invalidRows = prepared
    .map((item: any, index: number) => ({ item, index }))
    .filter(({ item }: any) => !item?.taxId || !item?.companyName);

  if (invalidRows.length > 0) {
    return NextResponse.json({ error: `พบข้อมูลไม่ครบถ้วนในแถวที่ ${invalidRows.map((r: any) => r.index + 2).join(', ')} (ต้องมีเลขประจำตัวผู้เสียภาษีและชื่อบริษัท)` }, { status: 400 });
  }

  try {
    const result = await Customer.insertMany(prepared as any, { ordered: false });
    return NextResponse.json({ message: 'นำเข้าข้อมูลลูกค้าสำเร็จ', count: result.length, customers: result });
  } catch (error: unknown) {
    const err = error as any;
    if (err.code === 11000) {
        return NextResponse.json({ error: 'พบข้อมูล Tax ID ซ้ำในระบบ' }, { status: 400 });
    }
    console.error('Customer import error', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลูกค้า' }, { status: 500 });
  }
}
