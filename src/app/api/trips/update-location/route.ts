import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { LineDriver } from '@/models/LineDriver';
import { getSessionToken, isInternalRole } from '@/lib/access';
import type { SessionTokenInfo } from '@/lib/access';
import { pusherServer } from '@/lib/pusher';

type TripAccessRecord = {
  _id: { toString(): string };
  companyId?: { toString(): string };
  companyName?: string;
  lineUserId?: string;
};

type LocationUpdateBody = {
  tripId?: unknown;
  lat?: unknown;
  lng?: unknown;
  speed?: unknown;
  heading?: unknown;
  timestamp?: unknown;
  address?: unknown;
  lineUserId?: unknown;
};

function sameTenant(token: SessionTokenInfo, trip: TripAccessRecord) {
  const tripCompanyId = trip.companyId?.toString?.();
  return (
    (!!token.companyId && !!tripCompanyId && token.companyId === tripCompanyId) ||
    (!!token.companyName && !!trip.companyName && token.companyName === trip.companyName)
  );
}

async function canUpdateLocation(req: NextRequest, trip: TripAccessRecord, lineUserId?: string) {
  const token = await getSessionToken(req);
  if (token && (isInternalRole(token.role) || sameTenant(token, trip))) return true;

  if (!lineUserId) return false;
  if (trip.lineUserId === lineUserId) return true;

  const driver = await LineDriver.findOne({ lineUserId }).select('activeTripId').lean();
  return driver?.activeTripId?.toString() === trip._id.toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as LocationUpdateBody;
    const tripId = typeof body.tripId === 'string' ? body.tripId : '';
    const lat = typeof body.lat === 'number' ? body.lat : undefined;
    const lng = typeof body.lng === 'number' ? body.lng : undefined;
    const speed = typeof body.speed === 'number' ? body.speed : null;
    const heading = typeof body.heading === 'number' ? body.heading : null;
    const timestamp = typeof body.timestamp === 'number' ? body.timestamp : undefined;
    const address = typeof body.address === 'string' ? body.address : '';
    const lineUserId = typeof body.lineUserId === 'string' ? body.lineUserId : undefined;

    if (!tripId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields (tripId, lat, lng)' }, { status: 400 });
    }

    await connectToDatabase();
    const lookup: Record<string, unknown>[] = [{ tripId }];
    if (mongoose.Types.ObjectId.isValid(tripId)) {
      lookup.push({ _id: new mongoose.Types.ObjectId(tripId) });
    }

    const trip = await Trip.findOne({ $or: lookup });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (!(await canUpdateLocation(req, trip, lineUserId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const pin = {
      lat,
      lng,
      speed: speed ?? null,
      heading: heading ?? null,
      timestamp: timestamp || now.getTime(),
      address: address || '',
      googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`
    };

    const updatedTrip = await Trip.findByIdAndUpdate(
      trip._id,
      {
        $set: {
          'gpsSession.source': 'web_platform',
          'gpsSession.status': 'active',
          'gpsSession.isTracking': true,
          'gpsSession.lastPingAt': now,
          'gpsSession.currentPin': pin
        },
        $push: {
          'gpsSession.locationHistory': {
            $each: [pin],
            $slice: -1000 // Keep last 1000 pins to prevent document bloat
          }
        }
      },
      { new: true }
    );

    if (!updatedTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Trigger Pusher event for real-time monitoring
    try {
      await pusherServer.trigger('fleet-tracking', 'location-updated', {
        tripId: updatedTrip.tripId,
        lat,
        lng,
        speed: speed ?? 0,
        heading: heading ?? 0,
        timestamp: pin.timestamp,
        driverName: updatedTrip.driverName || 'Unknown',
        licensePlate: updatedTrip.licensePlate || 'Unknown',
      });
    } catch (pError) {
      console.error('Pusher trigger error:', pError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
