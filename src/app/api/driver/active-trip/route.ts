import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { LineDriver } from '@/models/LineDriver';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 });
    }

    // 1. Find Driver by LINE ID
    const driver = await LineDriver.findOne({ lineUserId });
    if (!driver) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคนขับในระบบ' }, { status: 404 });
    }

    // 2. SSOT: Query Trip directly by lineUserId and active statuses.
    // We ignore driver.activeTripId to avoid sync issues.
    const activeStatuses = ['accepted', 'in_progress', 'arrived_pickup', 'en_route_pickup', 'en_route_dropoff', 'delivered', 'documents_submitted'];
    
    // Find the most recent trip that is still in an active state for this driver
    const activeTrip = await Trip.findOne({
      lineUserId,
      lineAssignmentStatus: { $in: activeStatuses }
    }).sort({ createdAt: -1 });

    // 3. Return results
    console.log(`[ActiveTripAPI] Lookup for ${lineUserId}: Found ${activeTrip ? activeTrip._id : 'None'}`);
    
    return NextResponse.json({ 
      activeTripId: activeTrip ? activeTrip._id.toString() : null 
    });

  } catch (error) {
    console.error('Active Trip Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
