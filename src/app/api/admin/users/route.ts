import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs'; // 🟢 ต้องใช้ตัวนี้เพื่อเข้ารหัสความปลอดภัย

export async function GET() {
  try {
    await connectToDatabase();
    // ดึงข้อมูล ID ออกมาโชว์ด้วย
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลได้' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId, newRole, name, companyName, phone, password } = await req.json();
    await connectToDatabase();

    const updateData: any = {};
    if (newRole) updateData.role = newRole;
    if (name !== undefined) updateData.name = name;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (phone !== undefined) updateData.phone = phone;
    
    // 🟢 ถ้ามีการส่งรหัสผ่านใหม่มา ให้เข้ารหัสก่อนบันทึก
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    return NextResponse.json({ message: 'อัปเดตข้อมูลสำเร็จ!', user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'อัปเดตข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// ... ฟังก์ชัน DELETE เหมือนเดิม ...