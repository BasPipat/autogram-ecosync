import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';

export const dynamic = 'force-dynamic';

async function requireAuth(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token;
}

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuth(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const trips = await Trip.find({}).sort({ createdAt: -1 });
    return NextResponse.json(trips);
  } catch {
    return NextResponse.json({ error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuth(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    await connectToDatabase();

    if (!data.tripId) {
      data.tripId = `TRP-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const newTrip = await Trip.create(data);
    return NextResponse.json({ message: 'สร้างงานสำเร็จ!', trip: newTrip }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 11000) {
      return NextResponse.json({ error: 'รหัสงานนี้มีซ้ำในระบบแล้ว กรุณาเปลี่ยนรหัสใหม่' }, { status: 400 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างงาน' }, { status: 500 });
  }
}