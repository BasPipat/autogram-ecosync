export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { LineDriver } from '@/models/LineDriver';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id: tripId } = resolvedParams;

    await connectToDatabase();

    // Find by either _id or tripId
    let trip = await Trip.findOne({ 
      $or: [
        { _id: tripId.length === 24 ? tripId : undefined },
        { tripId: tripId }
      ].filter(Boolean)
    }).lean();
    
    if (!trip) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      _id: trip._id,
      tripId: trip.tripId,
      origin: trip.origin,
      destination: trip.destination,
      weight: trip.weight,
      distance: trip.distance,
      driverName: trip.driverName,
      licensePlate: trip.licensePlate,
      driverId: trip.driverId,
      status: trip.status,
      isPublic: trip.isPublic,
      cargoType: trip.cargoType,
      cargoName: trip.cargoName,
      originMapUrl: trip.originMapUrl,
      destinationMapUrl: trip.destinationMapUrl,
      originPin: trip.originPin,
      destinationPin: trip.destinationPin
    });
  } catch (error) {
    console.error('Fetch driver job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id: tripId } = resolvedParams;
    const { lineUserId, action } = await req.json();

    await connectToDatabase();

    const trip = await Trip.findOne({ 
      $or: [
        { _id: tripId.length === 24 ? tripId : undefined },
        { tripId: tripId }
      ].filter(Boolean)
    });

    if (!trip) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    if (action === 'accept') {
      if (trip.driverId) return NextResponse.json({ error: 'Job already taken' }, { status: 400 });

      const driver = await LineDriver.findOne({ lineUserId });
      if (!driver) return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
      if (driver.status !== 'approved') return NextResponse.json({ error: 'Account pending approval' }, { status: 403 });

      trip.driverId = driver._id;
      trip.driverName = driver.displayName;
      trip.licensePlate = driver.licensePlate;
      trip.status = 'Pending'; // Change status to pending once taken
      trip.lineUserId = lineUserId;
      trip.lineAssignmentStatus = 'accepted';
      trip.opsStatus = 'accepted';
      await trip.save();

      await LineDriver.findOneAndUpdate({ lineUserId }, { activeTripId: trip._id });

      return NextResponse.json({ message: 'Job accepted successfully', trip });
    }

    if (action === 'complete') {
      trip.status = 'Verified'; // Or a new status like 'Delivered'
      trip.lineAssignmentStatus = 'delivered';
      trip.opsStatus = 'delivered';
      trip.deliveredAt = new Date();
      await trip.save();
      return NextResponse.json({ message: 'Job completed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
