export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Customer } from '@/models/Customer';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const ENGLISH_COMPANY_NAME = /^[A-Za-z0-9\s.,&'()/-]+$/;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(req: Request) {
  try {
    const { name, companyName, email, phone, password } = await req.json();
    const normalizedName = String(name || '').trim();
    const normalizedCompanyName = String(companyName || '').trim().replace(/\s+/g, ' ');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();
    const rawPassword = String(password || '');

    if (!normalizedName || !normalizedCompanyName || !normalizedEmail || !normalizedPhone || !rawPassword) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบถ้วน' }, { status: 400 });
    }

    if (!ENGLISH_COMPANY_NAME.test(normalizedCompanyName)) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อบริษัทเป็นภาษาอังกฤษเท่านั้น เช่น ACME LOGISTICS CO., LTD.' }, { status: 400 });
    }

    if (rawPassword.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
    }

    await connectToDatabase();

    // เช็กว่าอีเมลซ้ำไหม
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานแล้วครับ' }, { status: 400 });
    }

    const companyNameRegex = new RegExp(`^${escapeRegex(normalizedCompanyName)}$`, 'i');
    const [existingCompanyUser, existingCustomer] = await Promise.all([
      User.findOne({ companyName: companyNameRegex }).select('_id').lean(),
      Customer.findOne({ companyName: companyNameRegex }).select('_id').lean(),
    ]);

    if (existingCompanyUser || existingCustomer) {
      return NextResponse.json({ error: 'ชื่อบริษัทนี้มีอยู่ในระบบแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มผู้ใช้งานในบริษัทเดิม' }, { status: 400 });
    }

    const companyId = new mongoose.Types.ObjectId();

    // เข้ารหัสผ่าน
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Public signup creates a new cash customer tenant by default.
    await Customer.create({
      companyId,
      companyName: normalizedCompanyName,
      taxId: `PENDING-${companyId.toString()}`,
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      paymentType: 'cash',
    });

    await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: 'corp_admin',
      companyId,
      companyName: normalizedCompanyName,
    });

    return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ! บัญชีเริ่มต้นเป็นลูกค้าเงินสดเรียบร้อยแล้ว' }, { status: 201 });
  } catch (error) {
    console.error('Register Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสมัคร' }, { status: 500 });
  }
}
