import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    await connectToDatabase();

    // เช็กว่าอีเมลซ้ำไหม
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานแล้วครับ' }, { status: 400 });
    }

    // เข้ารหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // บันทึกผู้ใช้ใหม่ (ตั้งเป็น coordinator อัตโนมัติ ตาม role matrix ปัจจุบัน)
    await User.create({ name, email, password: hashedPassword, role: 'coordinator' });

    return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ!' }, { status: 201 });
  } catch (error) {
    console.error('Register Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสมัคร' }, { status: 500 });
  }
}