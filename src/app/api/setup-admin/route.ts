export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';


export async function GET() {
  try {
    await connectToDatabase();

    // เช็กก่อนว่ามีไอดีนี้อยู่แล้วหรือยัง จะได้ไม่สร้างซ้ำ
    const existingAdmin = await User.findOne({ email: 'admin@autogram.co.th' });
    
    if (existingAdmin) {
      return NextResponse.json({ message: 'มีไอดี Admin นี้ในระบบอยู่แล้วครับบอส!' });
    }

    // เข้ารหัสผ่านเพื่อความปลอดภัย
    const hashedPassword = await bcrypt.hash('Autogram2026!', 10);

    // สร้างไอดี Admin
    const adminUser = await User.create({
      name: 'Pipat (Super Admin)',
      email: 'admin@autogram.co.th',
      password: hashedPassword,
      role: 'admin',
    });

    return NextResponse.json({ 
      message: 'สร้างไอดี Admin สำเร็จแล้วครับ!', 
      email: adminUser.email 
    });

  } catch (error) {
    console.error('Setup Admin Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างไอดี' }, { status: 500 });
  }
}
