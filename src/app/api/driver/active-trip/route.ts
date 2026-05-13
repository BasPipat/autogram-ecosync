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

    // 2. Prefer the LINE driver's explicit activeTripId, then fall back to
    // trips assigned by lineUserId. Shared-truck jobs do not always set driverId.
    let activeTrip = null;
    if (driver.activeTripId) {
      activeTrip = await Trip.findOne({
        _id: driver.activeTripId,
        lineAssignmentStatus: { $in: ['accepted', 'in_progress', 'delivered', 'documents_submitted'] }
      });
    }

    if (!activeTrip) {
      activeTrip = await Trip.findOne({
        lineUserId,
        lineAssignmentStatus: { $in: ['accepted', 'in_progress', 'delivered', 'documents_submitted'] }
      }).sort({ createdAt: -1 });
    }

    // 3. Return results
    return NextResponse.json({ 
      activeTripId: activeTrip ? activeTrip._id.toString() : null 
    });

  } catch (error) {
    console.error('Active Trip Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
