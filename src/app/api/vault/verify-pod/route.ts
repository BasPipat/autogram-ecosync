import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { IntegrityVault } from '@/models/EcoSync';

export async function POST(request: Request) {
  try {
    const { tripId } = await request.json();

    if (!tripId) {
      return NextResponse.json({ error: 'ไม่มีรหัสงาน' }, { status: 400 });
    }

    await connectToDatabase();

    // ค้นหางานแล้วเปลี่ยนสถานะเป็น isVerified: true
    const updatedVault = await IntegrityVault.findOneAndUpdate(
      { tripId },
      { 
        isVerified: true,
        verifiedAt: new Date()
      },
      { new: true }
    );

    if (!updatedVault) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลหลักฐาน' }, { status: 404 });
    }

    return NextResponse.json({ message: 'อนุมัติหลักฐานสำเร็จ', data: updatedVault }, { status: 200 });

  } catch (error) {
    console.error('Verify API Error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}