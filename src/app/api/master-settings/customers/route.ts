export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Customer } from '@/models/Customer';
import { getSessionToken, isInternalRole } from '@/lib/access';
import mongoose from 'mongoose';


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

  if (isInternalRole(token.role)) {
    const profiles = await Customer.find().lean();
    return NextResponse.json({ profiles });
  }

  let query: Record<string, any> = {};
  if (token.companyId) {
    try {
      query = { companyId: new mongoose.Types.ObjectId(token.companyId) };
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

  const { taxId, address, email, phoneNumber, id, companyName, paymentType, billingDay, paymentDay, creditDays } = body;

  if (!taxId || !isValidThaiTaxId(taxId)) {
    return NextResponse.json({ error: 'เลขประจำตัวผู้เสียภาษี (Tax ID) 13 หลักไม่ถูกต้อง' }, { status: 400 });
  }

  // If internal role (system_owner/owner), they can update any company by ID or Name
  if (isInternalRole(token.role)) {
    try {
      let result;
      if (id) {
        result = await Customer.findByIdAndUpdate(
          id,
          { $set: { taxId, address, email, phoneNumber, companyName, paymentType, billingDay, paymentDay, creditDays } },
          { new: true }
        );
      } else {
        result = await Customer.findOneAndUpdate(
          { $or: [{ companyName }, { taxId }] },
          { $set: { taxId, address, email, phoneNumber, companyName, paymentType, billingDay, paymentDay, creditDays } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      return NextResponse.json({ message: 'บันทึกโปรไฟล์บริษัทสำเร็จ', profile: result });
    } catch (error: any) {
      console.error('Admin customer update error:', error);
      if (error.code === 11000) {
        return NextResponse.json({ error: 'พบข้อมูล Tax ID หรือชื่อบริษัทซ้ำในระบบ' }, { status: 400 });
      }
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }, { status: 500 });
    }
  }

  // The companyName is strictly locked to the user's session companyName
  // unless they are internal, but even then, this page is for the logged in user's profile.
  const sessionCompanyName = token.companyName;

  let query: Record<string, any> = {};
  if (token.companyId) {
    try {
      query = { companyId: new mongoose.Types.ObjectId(token.companyId) };
    } catch {
      query = { companyName: token.companyName };
    }
  } else if (token.companyName) {
    query = { companyName: token.companyName };
  } else {
    return NextResponse.json({ error: 'ไม่พบข้อมูลบริษัทของบัญชีนี้' }, { status: 400 });
  }

  const setOnInsert: any = {
    companyName: sessionCompanyName,
  };
  
  if (token.companyId) {
     try {
       setOnInsert.companyId = new mongoose.Types.ObjectId(token.companyId);
     } catch (e) {}
  }

  try {
    const result = await Customer.findOneAndUpdate(
      query,
      { 
        $set: { taxId, address, email, phoneNumber }, 
        $setOnInsert: setOnInsert 
      },
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

export async function DELETE(req: NextRequest) {
  const token = await getSessionToken(req);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (token.role !== 'system_owner' && token.role !== 'owner') {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing customer ID' }, { status: 400 });
  }

  await connectToDatabase();

  try {
    await Customer.findByIdAndDelete(id);
    return NextResponse.json({ message: 'ลบข้อมูลบริษัทสำเร็จ' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 });
  }
}

