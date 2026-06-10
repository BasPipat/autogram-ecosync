export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import mongoose from 'mongoose';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { LineDriver } from '@/models/LineDriver';


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const data = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid trip ID format' }, { status: 400 });
    }

    await connectToDatabase();

    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isInternalRole(token.role)) {
      if (token.role === 'corp_admin' || token.role === 'coordinator') {
        if (token.companyName) {
          query.$or = [
            { companyName: token.companyName },
            { customerName: token.companyName }
          ];
        } else {
          return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงงานนี้' }, { status: 403 });
        }
      } else if (token.companyId) {
         try { query.companyId = new mongoose.Types.ObjectId(token.companyId); } catch {}
      } else {
         query.companyName = token.companyName;
      }
    }

    // Strip administrative/routing fields for customer users to prevent spoofing
    if (!isInternalRole(token.role)) {
      delete data.companyId;
      delete data.companyName;
      delete data.customerName;
      delete data.driverId;
      delete data.driverName;
      delete data.licensePlate;
      delete data.tailLicensePlate;
      delete data.truckMasterId;
      delete data.sharedTruckId;
      delete data.lineUserId;
      delete data.lineAssignmentStatus;
      delete data.opsStatus;
    }
    
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

    // If unassigning a driver, clear their activeTripId in LineDriver
    if (data.lineUserId === null) {
      const oldTrip = await Trip.findOne(query).select('lineUserId');
      if (oldTrip?.lineUserId) {
        await LineDriver.findOneAndUpdate(
          { lineUserId: oldTrip.lineUserId },
          { $set: { activeTripId: undefined } }
        );
      }
    }

    const updatedTrip = await Trip.findOneAndUpdate(query, { $set: data }, { new: true });
    if (!updatedTrip) {
      return NextResponse.json({ error: 'ไม่พบงานที่ต้องการแก้ไข หรือคุณไม่มีสิทธิ์' }, { status: 404 });
    }

    return NextResponse.json({ message: 'แก้ไขงานสำเร็จ!', trip: updatedTrip });
  } catch (error: any) {
    console.error('Update trip error:', error);
    return NextResponse.json({ error: `เกิดข้อผิดพลาดในการแก้ไขงาน: ${error?.message || error}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid trip ID format' }, { status: 400 });
    }

    await connectToDatabase();

    const query: any = { _id: new mongoose.Types.ObjectId(id) };
    if (!isInternalRole(token.role)) {
      if (token.role === 'corp_admin' || token.role === 'coordinator') {
        if (token.companyName) {
          query.$or = [
            { companyName: token.companyName },
            { customerName: token.companyName }
          ];
        } else {
          return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงงานนี้' }, { status: 403 });
        }
      } else if (token.companyId) {
         try { query.companyId = new mongoose.Types.ObjectId(token.companyId); } catch {}
      } else {
         query.companyName = token.companyName;
      }
    }

    const deletedTrip = await Trip.findOneAndDelete(query);
    if (!deletedTrip) {
      return NextResponse.json({ error: 'ไม่พบงานที่ต้องการลบ หรือคุณไม่มีสิทธิ์' }, { status: 404 });
    }

    return NextResponse.json({ message: 'ลบงานสำเร็จ!' });
  } catch (error: any) {
    console.error('Delete trip error:', error);
    return NextResponse.json({ error: `เกิดข้อผิดพลาดในการลบงาน: ${error?.message || error}` }, { status: 500 });
  }
}
