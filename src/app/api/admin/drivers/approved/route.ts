import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { LineDriver } from '@/models/LineDriver';
import { SharedTruck } from '@/models/SharedTruck';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch approved drivers and populate their truck info if available
    const drivers = await LineDriver.find({ status: 'approved' })
      .populate('sharedTruckId')
      .sort({ displayName: 1 });

    const formattedDrivers = drivers.map(d => {
      const truck = d.sharedTruckId as any;
      return {
        lineUserId: d.lineUserId,
        displayName: d.displayName,
        phone: d.phone,
        licensePlate: d.licensePlate || truck?.headPlateNumber || '-',
        tailLicensePlate: truck?.tailPlateNumber || '-',
        pictureUrl: d.pictureUrl,
      };
    });

    return NextResponse.json(formattedDrivers);
  } catch (error) {
    console.error('Fetch Approved Drivers Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
