export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id: tripId } = resolvedParams;

    await connectToDatabase();

    // Find by human-readable tripId
    const trip = await Trip.findOne({ tripId }).lean();
    
    if (!trip) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Return only necessary info for driver
    return NextResponse.json({
      _id: trip._id,
      tripId: trip.tripId,
      origin: trip.origin,
      destination: trip.destination,
      weight: trip.weight,
      driverName: trip.driverName,
      licensePlate: trip.licensePlate,
      status: trip.status,
    });
  } catch (error) {
    console.error('Fetch driver job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
