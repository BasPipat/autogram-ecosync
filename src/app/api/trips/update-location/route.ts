import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { getSessionToken } from '@/lib/access';
import { pusherServer } from '@/lib/pusher';

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
        tripId,
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
