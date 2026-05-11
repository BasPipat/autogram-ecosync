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

    // 2. Find active trip for this driver
    // Using lineAssignmentStatus to determine if the mission is still active
    const activeTrip = await Trip.findOne({
      driverId: driver._id,
      lineAssignmentStatus: { $in: ['accepted', 'in_progress'] }
    }).sort({ createdAt: -1 });

    // 3. Return results
    return NextResponse.json({ 
      activeTripId: activeTrip ? activeTrip._id.toString() : null 
    });

  } catch (error: any) {
    console.error('Active Trip Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
