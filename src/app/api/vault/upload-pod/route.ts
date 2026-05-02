import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { IntegrityVault, Trip } from '@/models/EcoSync';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripId, podImageUrl } = body;

    // 1. ตรวจสอบข้อมูล
    if (!tripId || !podImageUrl) {
      return NextResponse.json({ error: 'กรุณาส่งรหัสงาน (tripId) และรูปลิงก์ (podImageUrl)' }, { status: 400 });
    }

    await connectToDatabase();

    // 2. เช็กว่า Trip นี้มีอยู่จริงและวิ่งเสร็จแล้วหรือยัง
    const existingTrip = await Trip.findOne({ tripId });
    if (!existingTrip) {
      return NextResponse.json({ error: 'ไม่พบรหัสงานขนส่งนี้ในระบบ' }, { status: 404 });
    }

    // 3. บันทึกหลักฐานลง Integrity Vault
    const newVaultEntry = await IntegrityVault.findOneAndUpdate(
      { tripId }, // หาจาก tripId
      { 
        tripId, 
        podImageUrl, 
        isVerified: false // ให้แอดมินหรือระบบหลังบ้านมากด Verify ทีหลัง
      },
      { upsert: true, new: true } // ถ้าไม่มีให้สร้างใหม่ ถ้ามีให้อัปเดต
    );

    return NextResponse.json({
      message: 'อัปโหลดหลักฐานใบส่งของสำเร็จ',
      vaultData: newVaultEntry
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in upload POD API:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกหลักฐาน' }, { status: 500 });
  }
}