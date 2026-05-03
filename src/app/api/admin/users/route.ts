import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  try {
    await connectToDatabase();
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้' }, { status: 500 });
  }
}

// 🟢 อัปเดตฟังก์ชัน PUT ให้รับข้อมูล ชื่อ, บริษัท, เบอร์โทร
export async function PUT(req: Request) {
  try {
    const { userId, newRole, name, companyName, phone } = await req.json();
    await connectToDatabase();

    // เตรียมแพ็กเกจข้อมูลที่จะอัปเดต (ถ้ามีข้อมูลส่งมา ถึงจะอัปเดต)
    const updateData: any = {};
    if (newRole) updateData.role = newRole;
    if (name !== undefined) updateData.name = name;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (phone !== undefined) updateData.phone = phone;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    return NextResponse.json({ message: 'อัปเดตข้อมูลสำเร็จ!', user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'อัปเดตข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

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