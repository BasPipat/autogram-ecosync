import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

// 1. ดึงรายชื่อผู้ใช้งานทั้งหมดออกมาโชว์
export async function GET() {
  try {
    await connectToDatabase();
    // ดึงมาทุกคน ยกเว้นรหัสผ่าน
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้' }, { status: 500 });
  }
}

// 2. รับคำสั่งเปลี่ยนยศ (Set Role)
export async function PUT(req: Request) {
  try {
    const { userId, newRole } = await req.json();
    await connectToDatabase();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    ).select('-password');

    return NextResponse.json({ message: 'เปลี่ยนสิทธิ์สำเร็จ!', user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'อัปเดตข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}