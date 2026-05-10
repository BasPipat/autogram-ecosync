export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { IntegrityVault } from '@/models/IntegrityVault';
import { getSessionToken } from '@/lib/access';

export async function POST(request: NextRequest) {
  try {
    // Add Authentication Check
    const token = await getSessionToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

  } catch (error: unknown) {
    console.error('Verify API Error:', error);
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดภายในระบบ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
