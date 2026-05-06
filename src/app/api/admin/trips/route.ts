import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
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
    let query: Record<string, any> = {};
    if (!isInternalRole(token.role)) {
      if (token.companyId) {
        try {
          query = { companyId: new ObjectId(token.companyId) };
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
    if (!isInternalRole(token.role)) {
      try {
        data.companyId = new ObjectId(token.companyId);
      } catch {
        return NextResponse.json({ error: 'Company ID ไม่ถูกต้อง' }, { status: 400 });
      }
    }

    const newTrip = await Trip.create(data);

    // Auto-save Origin & Destination to Location Master
    if (data.companyId) {
      try {
        const { Location } = await import('@/models/Location');
        
        const saveLocation = async (name: string, link: string, contact: string, phone: string) => {
          if (!name || !link) return;
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
      } catch (e) {
        console.error("Error loading Location model for auto-save", e);
      }
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