export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { Setting } from '@/models/Setting';
import { getSessionToken } from '@/lib/access';


/**
 * POST /api/trips/calculate-emission
 * Pre-compute carbon emission when trip is closed/verified.
 * Snapshots the current EF from Master Settings.
 *
 * Body: { tripId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tripId } = await req.json();
    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 });

    await connectToDatabase();

    const trip = await Trip.findOne({ tripId });
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    // Get active Master Settings
    const setting = await Setting.findOne({ isActive: true, scope: 'global', key: 'master-default' })
      .sort({ effectiveFrom: -1 });

    if (!setting) return NextResponse.json({ error: 'No active Master Settings found' }, { status: 400 });

    // Find EF for this vehicle type
    const vehicleType = trip.vehicleType || 'Trailer 22-Wheel';
    const efEntry = setting.emissionFactorsByVehicleType?.find(
      (v: any) => v.vehicleType === vehicleType
    );
    const ef = efEntry?.efTonKm ?? 0.0650; // default to Trailer if not found

    // Calculate
    const weight = trip.weight || 0;
    const distance = trip.distance || 0;
    const tonKm = weight * distance;
    const emissionKgCo2e = tonKm * ef;

    // Snapshot: save calculated values + audit trail
    await Trip.findByIdAndUpdate(trip._id, {
      tonKm,
      emissionFactor: ef,
      emissionKgCo2e,
      carbon: emissionKgCo2e, // backward compatible with legacy field
      tgoVersion: setting.version || 'TGO-2024',
      calculatedAt: new Date(),
      settingSnapshotId: setting._id,
      vehicleType, // ensure it's saved
    });

    return NextResponse.json({
      message: 'Emission calculated and saved',
      result: {
        tripId,
        vehicleType,
        weight,
        distance,
        tonKm: Math.round(tonKm * 100) / 100,
        emissionFactor: ef,
        emissionKgCo2e: Math.round(emissionKgCo2e * 100) / 100,
        tgoVersion: setting.version,
      },
    });
  } catch (error) {
    console.error('calculate-emission error', error);
    return NextResponse.json({ error: 'Failed to calculate emission' }, { status: 500 });
  }
}
