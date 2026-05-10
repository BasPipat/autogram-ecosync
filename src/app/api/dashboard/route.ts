export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { CarbonLedger } from '@/models/CarbonLedger';
import { IntegrityVault } from '@/models/IntegrityVault';

export const revalidate = 30; // 30 seconds caching to align with dashboard polling

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Fetch Stats in parallel
    const [totalTrips, carbonData, verifiedPODsCount] = await Promise.all([
      Trip.countDocuments(),
      CarbonLedger.aggregate([{ $group: { _id: null, total: { $sum: "$emissionsKgCO2" } } }]),
      IntegrityVault.countDocuments({ isVerified: true })
    ]);

    const totalCarbon = carbonData.length > 0 
      ? carbonData[0].total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : "0.00";

    // BUG-03: Calculate percentage for the UI
    const podComplianceRate = totalTrips > 0 
      ? Math.round((verifiedPODsCount / totalTrips) * 100) 
      : 0;

    // 2. Fetch Recent Trips
    const recentTrips = await Trip.find().sort({ createdAt: -1 }).limit(5).lean();
    const tripIds = recentTrips.map(t => t.tripId);

    // BUG-01: Fix N+1 Query - Batch fetch related data
    const [carbonRecords, vaultRecords] = await Promise.all([
      CarbonLedger.find({ tripId: { $in: tripIds } }).lean(),
      IntegrityVault.find({ tripId: { $in: tripIds } }).lean()
    ]);

    // Create maps for O(1) lookup
    const carbonMap = new Map(carbonRecords.map(r => [r.tripId, r]));
    const vaultMap = new Map(vaultRecords.map(r => [r.tripId, r]));

    const tripsWithDetails = recentTrips.map((trip) => {
      const carbon = carbonMap.get(trip.tripId);
      const vault = vaultMap.get(trip.tripId);
      
      return {
        id: trip.tripId,
        origin: trip.origin,
        dest: trip.destination,
        carbon: carbon ? carbon.emissionsKgCO2.toFixed(2) : '0.00',
        status: vault ? (vault.isVerified ? 'Verified' : 'Pending') : 'No POD'
      };
    });

    return NextResponse.json({
      stats: { 
        totalTrips, 
        totalCarbon, 
        verifiedPODs: podComplianceRate // Return percentage instead of raw count
      },
      recentTrips: tripsWithDetails
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Dashboard API Error:', error);
    const message = error instanceof Error ? error.message : 'ดึงข้อมูลล้มเหลว';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

