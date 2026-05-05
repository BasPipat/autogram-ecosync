import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/stats
 * Public endpoint (no auth required) — returns aggregate stats for landing page trust signals.
 */
export async function GET() {
  try {
    await connectToDatabase();

    const [stats] = await Trip.aggregate([
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          verifiedTrips: { $sum: { $cond: [{ $eq: ['$status', 'Verified'] }, 1, 0] } },
          totalDistanceKm: { $sum: { $ifNull: ['$distance', 0] } },
          totalCarbonKg: { $sum: { $ifNull: ['$emissionKgCo2e', { $ifNull: ['$carbon', 0] }] } },
          totalTonKm: { $sum: { $ifNull: ['$tonKm', 0] } },
          totalWeightTon: { $sum: { $ifNull: ['$weight', 0] } },
          uniqueCompanies: { $addToSet: '$companyName' },
        },
      },
    ]);

    return NextResponse.json({
      totalTrips: stats?.totalTrips || 0,
      verifiedTrips: stats?.verifiedTrips || 0,
      totalDistanceKm: Math.round(stats?.totalDistanceKm || 0),
      totalCarbonKg: Math.round((stats?.totalCarbonKg || 0) * 100) / 100,
      totalTonKm: Math.round(stats?.totalTonKm || 0),
      totalWeightTon: Math.round(stats?.totalWeightTon || 0),
      companyCount: stats?.uniqueCompanies?.filter(Boolean)?.length || 0,
    });
  } catch (error) {
    console.error('public stats error', error);
    return NextResponse.json({ totalTrips: 0, verifiedTrips: 0, totalDistanceKm: 0, totalCarbonKg: 0, companyCount: 0 });
  }
}
