import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { LineDriver } from '@/models/LineDriver';
import { SharedTruck } from '@/models/SharedTruck';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { lineUserId } = await req.json();

    if (!lineUserId) {
      return NextResponse.json({ error: 'Missing lineUserId' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Find the driver to get their latest info
    const driver = await LineDriver.findOne({ lineUserId }).populate('sharedTruckId');
    if (!driver) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลคนขับในระบบ LINE' }, { status: 404 });
    }

    const truck = driver.sharedTruckId as any;

    // 2. Update the Trip with driver info
    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      {
        lineUserId: driver.lineUserId,
        driverName: driver.displayName || driver.phone,
        licensePlate: driver.licensePlate || truck?.headPlateNumber,
        tailLicensePlate: truck?.tailPlateNumber,
        driverPhone: driver.phone,
        sharedTruckId: driver.sharedTruckId,
        lineAssignmentStatus: 'accepted', // Auto-set to accepted since Admin is assigning
        opsStatus: 'accepted',
        lineAcceptedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedTrip) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลงาน' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'ผูกข้อมูลคนขับเรียบร้อยแล้ว',
      trip: updatedTrip 
    });

  } catch (error) {
    console.error('Bind Driver Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
