export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';


export async function GET() {
  try {
    await connectToDatabase();
    
    // ค้นหาและอัปเดตยศให้อีเมลของบอสเป็น admin ทันที
    const updatedUser = await User.findOneAndUpdate(
      { email: 'l3aspipat@gmail.com' }, 
      { role: 'admin' },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'หาอีเมลนี้ไม่เจอครับบอส' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: '🎉 เลื่อนยศเป็น Admin สำเร็จแล้วครับ!', 
      user: updatedUser.email,
      role: updatedUser.role
    });

  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
