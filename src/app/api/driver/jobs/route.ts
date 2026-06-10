import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { LineDriver } from '@/models/LineDriver';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get('lineUserId');
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    await connectToDatabase();

    // 1. Get Driver Info to match capabilities
    let driver = null;
    if (lineUserId) {
      driver = await LineDriver.findOne({ lineUserId });
    }

    // 2. Query Public Jobs (ANY trip without a truck/driver assigned)
    let query: any = { 
      jobSheetReleased: { $ne: false },
      $and: [
        { $or: [{ licensePlate: { $exists: false } }, { licensePlate: null }, { licensePlate: '' }] },
        { $or: [{ lineUserId: { $exists: false } }, { lineUserId: null }, { lineUserId: '' }] }
      ]
    };

    let trips;
    if (lat && lng) {
      trips = await Trip.find({
        ...query,
        originLocation: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: 200000 // 200km radius
          }
        }
      }).limit(50);
    } else {
      trips = await Trip.find(query).sort({ createdAt: -1 }).limit(50);
    }

    return NextResponse.json(trips);
  } catch (error: any) {
    console.error('Job board fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
