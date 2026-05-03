import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const trips = await Trip.find({}).sort({ createdAt: -1 });
    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    await connectToDatabase();

    if (!data.tripId) {
      data.tripId = `TRP-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const newTrip = await Trip.create(data);
    return NextResponse.json({ message: 'สร้างงานสำเร็จ!', trip: newTrip }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'รหัสงานนี้มีซ้ำในระบบแล้ว กรุณาเปลี่ยนรหัสใหม่' }, { status: 400 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างงาน' }, { status: 500 });
  }
}