import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Customer } from '@/models/Customer';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

function isValidThaiTaxId(taxId: string): boolean {
  if (!taxId || taxId.length !== 13 || !/^\d{13}$/.test(taxId)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(taxId.charAt(i)) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(taxId.charAt(12));
}

export async function GET(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();

  let query: Record<string, any> = {};
  if (token.companyId) {
    try {
      query = { companyId: new ObjectId(token.companyId) };
    } catch {
      query = { companyName: token.companyName };
    }
  } else if (token.companyName) {
    query = { companyName: token.companyName };
  } else {
    return NextResponse.json({ profile: null });
  }

  // Get the single profile for this tenant
  const profile = await Customer.findOne(query).lean();
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  await connectToDatabase();

  const { taxId, address, email, phoneNumber } = body;

  // The companyName is strictly locked to the user's session companyName
  // unless they are internal, but even then, this page is for the logged in user's profile.
  const companyName = token.companyName;

  if (!taxId || !isValidThaiTaxId(taxId)) {
    return NextResponse.json({ error: 'เลขประจำตัวผู้เสียภาษี (Tax ID) 13 หลักไม่ถูกต้อง' }, { status: 400 });
  }

  let query: Record<string, any> = {};
  if (token.companyId) {
    try {
      query = { companyId: new ObjectId(token.companyId) };
    } catch {
      query = { companyName: token.companyName };
    }
  } else if (token.companyName) {
    query = { companyName: token.companyName };
  } else {
    return NextResponse.json({ error: 'ไม่พบข้อมูลบริษัทของบัญชีนี้' }, { status: 400 });
  }

  const updateData: any = {
    taxId,
    address: address || '',
    email: email || '',
    phoneNumber: phoneNumber || '',
  };

  // Ensure companyName is set on insert, but we don't allow changing it if it already exists
  updateData.$setOnInsert = {
    companyName: companyName,
  };
  
  if (token.companyId) {
     try {
       updateData.$setOnInsert.companyId = new ObjectId(token.companyId);
     } catch (e) {}
  }

  try {
    const result = await Customer.findOneAndUpdate(
      query,
      { $set: updateData.taxId ? { taxId, address, email, phoneNumber } : updateData, $setOnInsert: updateData.$setOnInsert },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ message: 'บันทึกโปรไฟล์บริษัทสำเร็จ', profile: result });
  } catch (error: unknown) {
    const err = error as any;
    if (err.code === 11000) {
        return NextResponse.json({ error: 'พบข้อมูล Tax ID ซ้ำในระบบ (บริษัทอื่นอาจใช้งานอยู่)' }, { status: 400 });
    }
    console.error('Company Profile save error', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }, { status: 500 });
  }
}
