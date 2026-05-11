import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { getSessionToken } from '@/lib/access';

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId, lat, lng, speed, heading, timestamp, address } = await req.json();

    if (!tripId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields (tripId, lat, lng)' }, { status: 400 });
    }

    await connectToDatabase();

    // Security Audit: Check trip status and company visibility
    const trip = await Trip.findOne({ tripId });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Only allow updates for active trips
    if (trip.gpsSession?.status !== 'active') {
      return NextResponse.json({ error: 'Trip is not in an active tracking state' }, { status: 400 });
    }

    // Tenant Isolation Check (if applicable)
    if (token.role !== 'system_owner' && token.companyId && trip.companyId) {
      if (trip.companyId.toString() !== token.companyId) {
        return NextResponse.json({ error: 'Forbidden: Company mismatch' }, { status: 403 });
      }
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

    const updatedTrip = await Trip.findOneAndUpdate(
      { tripId },
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
            $slice: -1000 // Archiving Strategy: Prevent massive document growth
          }
        }
      },
      { new: true }
    );

    if (!updatedTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
