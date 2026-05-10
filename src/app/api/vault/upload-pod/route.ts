export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { IntegrityVault } from '@/models/IntegrityVault';
import { getSessionToken } from '@/lib/access';

export async function POST(request: NextRequest) {
  try {
    // SEC-01: Add Authentication Check
    const token = await getSessionToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // BUG-02: Client sends podUrl, API was expecting podImageUrl
    const { tripId, podUrl } = body;
    const podImageUrl = podUrl; // Support the client-side field name

    // 1. ตรวจสอบข้อมูล
    if (!tripId || !podImageUrl) {
      return NextResponse.json({ error: 'กรุณาส่งรหัสงาน (tripId) และรูปลิงก์ (podUrl)' }, { status: 400 });
    }

    await connectToDatabase();

    // 2. เช็กว่า Trip นี้มีอยู่จริง
    const existingTrip = await Trip.findOne({ tripId });
    if (!existingTrip) {
      return NextResponse.json({ error: 'ไม่พบรหัสงานขนส่งนี้ในระบบ' }, { status: 404 });
    }

    // 3. บันทึกหลักฐานลง Integrity Vault
    const newVaultEntry = await IntegrityVault.findOneAndUpdate(
      { tripId },
      { 
        tripId, 
        podImageUrl, 
        isVerified: false 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: 'อัปโหลดหลักฐานใบส่งของสำเร็จ',
      vaultData: newVaultEntry
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error in upload POD API:', error);
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกหลักฐาน';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
