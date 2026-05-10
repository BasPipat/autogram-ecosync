export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { Driver } from '@/models/Driver';
import mongoose from 'mongoose';
import { getSessionToken, isInternalRole } from '@/lib/access';


const ALLOWED_ROLES = new Set(['owner', 'admin', 'operator', 'corp_admin', 'coordinator']);

export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String((token as { role?: string }).role || '');
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();
    
    let query: any = {
      'gpsSession.status': 'active',
      'gpsSession.isTracking': true,
    };

    if (!isInternalRole(role)) {
      if (token.companyId) {
        try {
          query.companyId = new mongoose.Types.ObjectId(token.companyId);
        } catch {
          query.companyName = token.companyName;
        }
      } else {
        query.companyName = token.companyName;
      }
    }

    const activeTrips = await Trip.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    const driverIds = activeTrips
      .map((trip) => trip.driverId)
      .filter(Boolean)
      .map((id) => String(id));

    const drivers = await Driver.find({ _id: { $in: driverIds } }).lean();
    const driverById = new Map(drivers.map((d) => [String(d._id), d]));

    const markers = activeTrips
      .map((trip) => {
        const pin = trip.gpsSession?.currentPin || trip.destinationPin || trip.originPin;
        if (!pin?.lat || !pin?.lng) return null;
        const driver = trip.driverId ? driverById.get(String(trip.driverId)) : null;
        return {
          tripId: trip.tripId,
          lat: pin.lat,
          lng: pin.lng,
          locationName: pin.address || trip.destination || trip.origin,
          driverName: driver?.fullName || 'ไม่ระบุคนขับ',
          driverPhone: driver?.phone || '-',
        };
      })
      .filter(Boolean);

    return NextResponse.json({ markers });
  } catch (error) {
    console.error('active-trucks error', error);
    return NextResponse.json({ error: 'ดึงข้อมูลรถ Active ไม่สำเร็จ' }, { status: 500 });
  }
}
