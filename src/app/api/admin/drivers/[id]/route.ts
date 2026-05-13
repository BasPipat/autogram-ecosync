import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { LineDriver } from '@/models/LineDriver';
import { SharedTruck } from '@/models/SharedTruck';
import { DriverDocument } from '@/models/DriverDocument';
import { Trip } from '@/models/Trip';
import { getSessionToken, isInternalRole } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token || !isInternalRole(token.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const lineUserId = id;
    await connectToDatabase();

    // 1. Fetch Driver
    const driver = await LineDriver.findOne({ lineUserId });
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // 2. Fetch Associated Truck
    const truck = driver.sharedTruckId 
      ? await SharedTruck.findById(driver.sharedTruckId)
      : await SharedTruck.findOne({ lineUserId });

    // 3. Fetch All Documents
    const documents = await DriverDocument.find({ lineUserId }).sort({ createdAt: -1 });

    // 4. Fetch Trip Stats
    const trips = await Trip.find({ lineUserId }).sort({ createdAt: -1 }).limit(10);
    const totalTrips = await Trip.countDocuments({ lineUserId, status: 'completed' });
    
    // Calculate total earnings (example logic)
    const completedTrips = await Trip.find({ lineUserId, status: 'completed' });
    const totalEarnings = completedTrips.reduce((sum, trip) => sum + (trip.freightPrice || 0), 0);

    return NextResponse.json({
      driver,
      truck,
      documents,
      stats: {
        totalTrips,
        totalEarnings,
        tripHistory: trips
      }
    });
  } catch (error: any) {
    console.error('Admin Driver API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getSessionToken(req);
    if (!token || !isInternalRole(token.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, isDocumentsVerified, reviewNote } = await req.json();
    const { id } = await params;
    const lineUserId = id;
    await connectToDatabase();

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'approved') updateData.approvedAt = new Date();
      if (status === 'rejected') updateData.rejectedAt = new Date();
    }
    if (isDocumentsVerified !== undefined) {
      updateData.isDocumentsVerified = isDocumentsVerified;
      if (isDocumentsVerified) {
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = token.id; // Using user ID from token
      }
    }
    if (reviewNote !== undefined) updateData.reviewNote = reviewNote;

    const updated = await LineDriver.findOneAndUpdate({ lineUserId }, updateData, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Driver updated successfully', driver: updated });
  } catch (error: any) {
    console.error('Admin Driver Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
