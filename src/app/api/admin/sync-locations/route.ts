export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { Location } from '@/models/Location';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const trips = await Trip.find({ companyId: { $exists: true } });
    
    let count = 0;
    for (const trip of trips) {
      if (trip.origin && trip.originMapUrl) {
        await Location.findOneAndUpdate(
          { companyId: trip.companyId, name: trip.origin.trim() },
          { 
            $setOnInsert: { 
              companyId: trip.companyId, 
              name: trip.origin.trim(), 
              locationLink: trip.originMapUrl, 
              contactPerson: trip.originContactName || '', 
              phoneNumber: trip.originContactPhone || '' 
            } 
          },
          { upsert: true }
        );
        count++;
      }
      
      if (trip.destination && trip.destinationMapUrl) {
        await Location.findOneAndUpdate(
          { companyId: trip.companyId, name: trip.destination.trim() },
          { 
            $setOnInsert: { 
              companyId: trip.companyId, 
              name: trip.destination.trim(), 
              locationLink: trip.destinationMapUrl, 
              contactPerson: trip.destinationContactName || '', 
              phoneNumber: trip.destinationContactPhone || '' 
            } 
          },
          { upsert: true }
        );
        count++;
      }
    }
    
    return NextResponse.json({ message: 'Synced historical trips to Location Master', count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

