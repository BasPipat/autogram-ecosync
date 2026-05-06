import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { Location } from '@/models/Location';
import mongoose from 'mongoose';
import { getSessionToken, isInternalRole } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    let query: Record<string, any> = {};
    if (!isInternalRole(token.role)) {
      if (token.companyId) {
        try {
          query = { companyId: new mongoose.Types.ObjectId(token.companyId) };
        } catch {
          query = { companyName: token.companyName };
        }
      } else if (token.companyName) {
        query = { companyName: token.companyName };
      } else {
        return NextResponse.json([]); // return empty gracefully
      }
    }
    const trips = await Trip.find(query).sort({ createdAt: -1 });
    return NextResponse.json(trips);
  } catch {
    return NextResponse.json({ error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    await connectToDatabase();

    if (!data.tripId) {
      data.tripId = `TRP-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    // Ensure companyId is set for the trip and for auto-save logic
    if (!data.companyId && token.companyId) {
      try {
        data.companyId = new mongoose.Types.ObjectId(token.companyId);
      } catch (e) {
        console.error("Invalid companyId in token", e);
      }
    } else if (data.companyId && typeof data.companyId === 'string') {
      data.companyId = new mongoose.Types.ObjectId(data.companyId);
    }

    const newTrip = await Trip.create(data);

    // Auto-save Origin & Destination to Location Master
    if (data.companyId) {
      const saveLocation = async (name: string, link: string, contact: string, phone: string) => {
        if (!name) return;
        try {
          await Location.findOneAndUpdate(
            { companyId: data.companyId, name: name.trim() },
            { 
              $setOnInsert: { 
                companyId: data.companyId, 
                name: name.trim(), 
                locationLink: link, 
                contactPerson: contact || '', 
                phoneNumber: phone || '' 
              } 
            },
            { upsert: true }
          );
        } catch (e) {
          console.error("Failed to auto-save location", e);
        }
      };

      await saveLocation(data.origin, data.originMapUrl, data.originContactName, data.originContactPhone);
      await saveLocation(data.destination, data.destinationMapUrl, data.destinationContactName, data.destinationContactPhone);
    }

    return NextResponse.json({ message: 'สร้างงานสำเร็จ!', trip: newTrip }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 11000) {
      return NextResponse.json({ error: 'รหัสงานนี้มีซ้ำในระบบแล้ว กรุณาเปลี่ยนรหัสใหม่' }, { status: 400 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างงาน' }, { status: 500 });
  }
}