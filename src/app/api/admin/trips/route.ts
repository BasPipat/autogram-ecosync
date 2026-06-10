export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { Location } from '@/models/Location';
import { DriverDocument } from '@/models/DriverDocument';
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
      if (token.role === 'corp_admin' || token.role === 'coordinator') {
        if (token.companyName) {
          query = {
            $or: [
              { companyName: token.companyName },
              { customerName: token.companyName }
            ]
          };
        } else {
          return NextResponse.json([]);
        }
      } else if (token.companyId) {
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
    const trips = await Trip.find(query).select('-locationHistory').sort({ createdAt: -1 });
    
    // Find driver documents for these trips to attach POD and Video IDs
    const tripIds = trips.map(t => t._id);
    const lineUserIds = trips.map(t => t.lineUserId).filter(Boolean);

    // Primary: match by tripId; Secondary: match by lineUserId for docs without tripId
    const [docsByTrip, docsByUser] = await Promise.all([
      DriverDocument.find({
        tripId: { $in: tripIds },
        documentType: { $in: ['pod_image', 'delivery_documents_video'] },
      }).select('_id tripId lineUserId documentType createdAt').lean(),
      lineUserIds.length > 0
        ? DriverDocument.find({
            lineUserId: { $in: lineUserIds },
            tripId: { $exists: false },
            documentType: { $in: ['pod_image', 'delivery_documents_video'] },
          }).select('_id tripId lineUserId documentType createdAt').lean()
        : Promise.resolve([]),
    ]);

    const allDocs = [...docsByTrip, ...docsByUser];

    const tripsWithDocs = trips.map(trip => {
      const tripObj = trip.toObject();

      // First try to match by tripId
      let podDoc = allDocs.find(d => String(d.tripId) === String(trip._id) && d.documentType === 'pod_image');
      let videoDoc = allDocs.find(d => String(d.tripId) === String(trip._id) && d.documentType === 'delivery_documents_video');

      // Fallback: match by lineUserId (docs that were saved without a tripId reference)
      if (!podDoc && trip.lineUserId) {
        podDoc = allDocs
          .filter(d => d.lineUserId === trip.lineUserId && d.documentType === 'pod_image' && !d.tripId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      }
      if (!videoDoc && trip.lineUserId) {
        videoDoc = allDocs
          .filter(d => d.lineUserId === trip.lineUserId && d.documentType === 'delivery_documents_video' && !d.tripId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      }

      tripObj.podDocId = podDoc ? String(podDoc._id) : undefined;
      tripObj.videoDocId = videoDoc ? String(videoDoc._id) : undefined;
      return tripObj;
    });

    return NextResponse.json(tripsWithDocs);
  } catch (error) {
    console.error("GET trips admin error:", error);
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
    if (token.role === 'corp_admin' || token.role === 'coordinator') {
      data.customerName = token.companyName;
      data.companyName = 'SHIF CO., LTD.'; // Assign to the main logistics carrier
      data.companyId = undefined;
    } else {
      if (token.companyId) {
        try {
          data.companyId = new mongoose.Types.ObjectId(token.companyId);
        } catch (e) {}
      }
      if (token.companyName) {
        data.companyName = token.companyName;
      }
    }

    // Extract coordinates for GeoJSON indexing
    // Extract coordinates for GeoJSON indexing and Pins
    const extractCoords = (url: string) => {
      const match = url?.match(/q=([\d.-]+),([\d.-]+)/) || url?.match(/@([\d.-]+),([\d.-]+)/);
      if (match) {
        return {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2])
        };
      }
      return null;
    };

    const originCoords = extractCoords(data.originMapUrl);
    if (originCoords) {
      data.originLocation = { type: 'Point', coordinates: [originCoords.lng, originCoords.lat] };
      data.originPin = { ...originCoords, googleMapsUrl: data.originMapUrl };
    }

    const destCoords = extractCoords(data.destinationMapUrl);
    if (destCoords) {
      data.destinationLocation = { type: 'Point', coordinates: [destCoords.lng, destCoords.lat] };
      data.destinationPin = { ...destCoords, googleMapsUrl: data.destinationMapUrl };
    }

    const createdTrips = [];

    // Lookup payment terms from Customer Master
    const { Customer } = await import('@/models/Customer');
    let cust = null;
    if (data.customerName) {
      cust = await Customer.findOne({ companyName: data.customerName }).lean();
    }
    if (!cust && token.companyId) {
      try {
        cust = await Customer.findOne({ companyId: new mongoose.Types.ObjectId(token.companyId) }).lean();
      } catch (e) {}
    }
    if (!cust && token.companyName) {
      cust = await Customer.findOne({ companyName: token.companyName }).lean();
    }

    const customerPaymentType = cust?.paymentType || 'cash';

    for (let i = 0; i < count; i++) {
      const tripData = { ...data };
      // If count > 1, add a suffix to tripId to make them unique and sequential
      tripData.tripId = count > 1 ? `${baseTripId}-${i + 1}` : baseTripId;
      
      // Each trip record should represent 1 vehicle in the system for tracking
      tripData.vehicleCount = 1; 

      // Apply inherited payment terms
      tripData.paymentType = customerPaymentType;
      tripData.paymentStatus = 'unpaid';

      if (customerPaymentType === 'cash') {
        tripData.jobSheetReleased = false;
        tripData.isPublic = false; // Block dispatch
      } else {
        tripData.jobSheetReleased = true;
      }

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
