
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { LineDriver } from '@/models/LineDriver';
import { SharedTruck } from '@/models/SharedTruck';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 });
    }

    await connectToDatabase();

    const driver = await LineDriver.findOne({ lineUserId });
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const truck = driver.sharedTruckId 
      ? await SharedTruck.findById(driver.sharedTruckId)
      : await SharedTruck.findOne({ lineUserId });

    return NextResponse.json({
      displayName: driver.displayName || 'Driver',
      pictureUrl: driver.pictureUrl,
      phone: driver.phone || truck?.driverPhone,
      status: driver.status,
      vehicleType: truck?.vehicleType,
      licensePlate: truck?.headPlateNumber,
    });
  } catch (error: any) {
    console.error('Profile API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
