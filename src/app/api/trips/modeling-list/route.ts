export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { getSessionToken } from '@/lib/access';

/**
 * Fetch latest trips for the modeling page dropdown.
 * Limited to system_owner.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionToken(req);
    if (!session || session.role !== 'system_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();
    
    // Fetch last 50 trips with relevant data
    const trips = await Trip.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .select('tripId origin destination distance weight vehicleType')
      .lean();

    return NextResponse.json(trips);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}
