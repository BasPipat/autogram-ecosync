import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

// 1. ดึงข้อมูล
export async function GET() {
  try {
    await connectToDatabase();
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้' }, { status: 500 });
  }
}

// 2. เปลี่ยนยศ
export async function PUT(req: Request) {
  try {
    const { userId, newRole } = await req.json();
    await connectToDatabase();
    const updatedUser = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true }).select('-password');
    return NextResponse.json({ message: 'เปลี่ยนสิทธิ์สำเร็จ!', user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'อัปเดตข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// 3. ลบผู้ใช้งาน (เพิ่มใหม่!)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    await connectToDatabase();
    await User.findByIdAndDelete(userId);
    return NextResponse.json({ message: 'ลบผู้ใช้งานสำเร็จ!' });
  } catch (error) {
    return NextResponse.json({ error: 'ลบข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}