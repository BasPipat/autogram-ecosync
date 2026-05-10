export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { Location } from '@/models/Location';
import mongoose from 'mongoose';
import { getSessionToken, isInternalRole } from '@/lib/access';


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
        return NextResponse.json([]); 
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

    const baseTripId = data.tripId || `TRP-${Math.floor(100000 + Math.random() * 900000)}`;
    const count = Math.max(1, parseInt(data.vehicleCount) || 1);

    // Populate tenant info
    if (token.companyId) {
      try {
        data.companyId = new mongoose.Types.ObjectId(token.companyId);
      } catch (e) {}
    }
    if (token.companyName) {
      data.companyName = token.companyName;
    }

    const createdTrips = [];

    for (let i = 0; i < count; i++) {
      const tripData = { ...data };
      // If count > 1, add a suffix to tripId to make them unique and sequential
      tripData.tripId = count > 1 ? `${baseTripId}-${i + 1}` : baseTripId;
      
      // Each trip record should represent 1 vehicle in the system for tracking
      tripData.vehicleCount = 1; 

      const newTrip = await Trip.create(tripData);
      createdTrips.push(newTrip);
    }

    // Auto-save Origin & Destination to Location Master (only once)
    const saveLocation = async (name: string, link: string, contact: string, phone: string) => {
      if (!name) return;
      try {
        const filter: any = { name: name.trim() };
        if (data.companyId) {
          filter.companyId = data.companyId;
        } else if (data.companyName) {
          filter.companyName = data.companyName;
        } else {
          return; 
        }

        await Location.findOneAndUpdate(
          filter,
          { 
            $setOnInsert: { 
              ...filter,
              locationLink: link || '', 
              contactPerson: contact || '', 
              phoneNumber: phone || '',
              companyName: data.companyName || token.companyName
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

    return NextResponse.json({ 
      message: count > 1 ? `สร้างงานสำเร็จ ${count} รายการ!` : 'สร้างงานสำเร็จ!', 
      trip: count > 1 ? createdTrips[0] : createdTrips[0], // Keep backward compatibility for single trip return
      trips: createdTrips 
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Trip creation error:", error);
    const err = error as { code?: number };
    if (err.code === 11000) {
      return NextResponse.json({ error: 'รหัสงานนี้มีซ้ำในระบบแล้ว (หรือรหัสที่รันลำดับซ้ำ) กรุณาเปลี่ยนรหัสใหม่' }, { status: 400 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างงาน' }, { status: 500 });
  }
}
