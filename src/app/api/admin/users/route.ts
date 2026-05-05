import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const query = isInternalRole(token.role) ? {} : { companyId: new ObjectId(token.companyId) };
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, newRole, name, companyName, phone, password, username } = await req.json();
    await connectToDatabase();

    const updateData: Record<string, string> = {};
    if (username !== undefined) updateData.username = username;
    if (newRole) updateData.role = newRole;
    if (name !== undefined) updateData.name = name;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (phone !== undefined) updateData.phone = phone;
    
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const scope = isInternalRole(token.role)
      ? { _id: userId }
      : { _id: userId, companyId: new ObjectId(token.companyId) };
    const updatedUser = await User.findOneAndUpdate(scope, updateData, { new: true }).select('-password');
    if (!updatedUser) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขผู้ใช้ข้ามบริษัท' }, { status: 403 });
    }
    return NextResponse.json({ message: 'Updated successfully', user: updatedUser });
  } catch (error: unknown) {
    const msg = (error as { code?: number }).code === 11000 ? 'User ID หรือ Email นี้มีผู้ใช้งานแล้ว' : 'Update failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 🟢 อัปเดตใหม่: เปลี่ยนมารับค่าจาก Body แทน URL ป้องกัน Vercel อ่านค่าพลาด
export async function DELETE(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const userIdFromQuery = url.searchParams.get('userId');
    const body = await req.json().catch(() => ({} as { userId?: string }));
    const userId = userIdFromQuery || body.userId;

    if (!userId) {
      return NextResponse.json({ error: 'ไม่พบรหัสผู้ใช้งานที่ต้องการลบ' }, { status: 400 });
    }

    await connectToDatabase();
    const scope = isInternalRole(token.role)
      ? { _id: userId }
      : { _id: userId, companyId: new ObjectId(token.companyId) };
    const deleted = await User.findOneAndDelete(scope);
    if (!deleted) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานที่เลือกหรือไม่มีสิทธิ์ลบ' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch {
    return NextResponse.json({ error: 'ระบบเซิร์ฟเวอร์ขัดข้อง' }, { status: 500 });
  }
}