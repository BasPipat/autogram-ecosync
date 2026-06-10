export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { CarbonLedger } from '@/models/CarbonLedger';
import { IntegrityVault } from '@/models/IntegrityVault';
import { getSessionToken, isInternalRole } from '@/lib/access';

export const revalidate = 30; // 30 seconds caching to align with dashboard polling

export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tripQuery: any = {};
    if (!isInternalRole(token.role)) {
      const conditions = [];
      if (token.companyId) {
        if (mongoose.Types.ObjectId.isValid(token.companyId)) {
          conditions.push({ companyId: new mongoose.Types.ObjectId(token.companyId) });
        }
        conditions.push({ companyId: token.companyId });
      }
      if (token.companyName) {
        conditions.push({ companyName: token.companyName });
      }
      
      if (conditions.length > 0) {
        tripQuery.$or = conditions;
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await connectToDatabase();

    // 1. Fetch Stats in parallel (Tenant Scoped)
    const [totalTrips, tripAgg, verifiedPODsCount, activeTrips] = await Promise.all([
      Trip.countDocuments(tripQuery),
      Trip.aggregate([
        { $match: tripQuery },
        {
          $lookup: {
            from: 'carbonledgers',
            localField: 'tripId',
            foreignField: 'tripId',
            as: 'ledger'
          }
        },
        { $unwind: { path: '$ledger', preserveNullAndEmptyArrays: true } },
        { 
          $group: { 
            _id: null, 
            totalLedger: { $sum: '$ledger.emissionsKgCO2' },
            totalTripCarbon: { $sum: '$carbon' }
          }
        }
      ]),
      Trip.countDocuments({ ...tripQuery, status: 'Verified' }),
      Trip.countDocuments({
        ...tripQuery,
        lineAssignmentStatus: { $in: ['accepted', 'in_progress', 'arrived_pickup', 'en_route_pickup', 'en_route_dropoff'] }
      })
    ]);

    const ledgerSum = tripAgg.length > 0 ? (tripAgg[0].totalLedger || 0) : 0;
    const tripSum = tripAgg.length > 0 ? (tripAgg[0].totalTripCarbon || 0) : 0;
    const finalTotal = Math.max(ledgerSum, tripSum);

    const totalCarbon = finalTotal.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });

    // BUG-03: Calculate percentage for the UI
    const podComplianceRate = totalTrips > 0
      ? Math.round((verifiedPODsCount / totalTrips) * 100)
      : 0;

    // 2. Fetch Recent Trips
    const recentTrips = await Trip.find(tripQuery).select('-locationHistory').sort({ createdAt: -1 }).limit(10).lean();
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
      const ledgerEntry = carbonMap.get(trip.tripId);
      const vault = vaultMap.get(trip.tripId);
      const status = vault 
        ? (vault.isVerified ? 'Verified' : 'Pending') 
        : (trip.status || 'No POD');
      
      // Fallback: If ledgerEntry is missing, use trip.carbon (legacy) or trip.emissionKgCo2e
      const carbonVal = ledgerEntry 
        ? ledgerEntry.emissionsKgCO2 
        : (trip.emissionKgCo2e || trip.carbon || 0);

      return {
        id: trip.tripId,
        origin: trip.origin,
        dest: trip.destination,
        carbon: carbonVal.toFixed(2),
        status,
      };
    });

    // Chart data: POD status breakdown for Pie Chart across ALL trips in DB
    const [verifiedCount, pendingCount, noPodCount] = await Promise.all([
      Trip.countDocuments({ ...tripQuery, status: 'Verified' }),
      Trip.countDocuments({ ...tripQuery, status: 'Pending' }),
      Trip.countDocuments({ ...tripQuery, status: { $nin: ['Verified', 'Pending'] } })
    ]);

    const statusBreakdown = [
      { name: 'Verified', value: verifiedCount, color: '#10B981' },
      { name: 'Pending', value: pendingCount, color: '#F59E0B' },
      { name: 'No POD', value: noPodCount, color: '#94A3B8' },
    ].filter(s => s.value > 0); // hide zero-value slices

    // Chart data: Carbon per trip for Bar Chart
    const carbonChart = tripsWithDetails.map(t => ({
      name: t.id ? t.id.slice(-6) : '—',
      carbon: parseFloat(t.carbon) || 0,
      status: t.status,
    }));

    // Fetch initially active units for the map
    const activeTripsRaw = await Trip.find({
      ...tripQuery,
      'gpsSession.isTracking': true,
      'gpsSession.currentPin.lat': { $exists: true }
    }).select('tripId driverName licensePlate gpsSession.currentPin').lean();

    const initialActiveUnits: Record<string, any> = {};
    activeTripsRaw.forEach((t: any) => {
      if (t.gpsSession?.currentPin) {
        let lat = Number(t.gpsSession.currentPin.lat);
        let lng = Number(t.gpsSession.currentPin.lng);
        if (t.gpsSession.currentPin.lat?.$numberDecimal) lat = Number(t.gpsSession.currentPin.lat.$numberDecimal);
        if (t.gpsSession.currentPin.lng?.$numberDecimal) lng = Number(t.gpsSession.currentPin.lng.$numberDecimal);

        if (!isNaN(lat) && !isNaN(lng)) {
          initialActiveUnits[t.tripId] = {
            tripId: t.tripId,
            driverName: t.driverName || 'ไม่ระบุชื่อ',
            licensePlate: t.licensePlate || 'ไม่ระบุทะเบียน',
            lat,
            lng,
            speed: t.gpsSession.currentPin.speed || 0,
            heading: t.gpsSession.currentPin.heading || 0,
            lastUpdate: t.gpsSession.currentPin.timestamp || Date.now(),
          };
        }
      }
    });

    // 3. Billing Stats (parallel calculation)
    const [
      unpaidCashTrips,
      pendingCashTrips,
      unpaidCreditTrips,
      pendingBatchesCount
    ] = await Promise.all([
      Trip.find({ ...tripQuery, paymentType: 'cash', paymentStatus: 'unpaid' }).select('acceptedFreightPrice').lean(),
      Trip.countDocuments({ ...tripQuery, paymentType: 'cash', paymentStatus: 'pending_verification' }),
      Trip.find({ ...tripQuery, paymentType: 'credit', paymentStatus: 'unpaid' }).select('acceptedFreightPrice').lean(),
      Trip.distinct('paymentBatchId', { ...tripQuery, paymentType: 'cash', paymentStatus: 'pending_verification' })
    ]);

    const unpaidCashAmount = unpaidCashTrips.reduce((s, t) => s + (Number(t.acceptedFreightPrice) || 0), 0);
    const unpaidCreditAmount = unpaidCreditTrips.reduce((s, t) => s + (Number(t.acceptedFreightPrice) || 0), 0);

    const activeTripsList = await Trip.find({ ...tripQuery })
    .select('_id tripId driverName licensePlate tailLicensePlate origin destination opsStatus lineAssignmentStatus updatedAt lineUserId gpsSession.lastPingAt companyName customerName')
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json({
      userRole: token.role,
      stats: {
        totalTrips,
        activeTrips,
        totalCarbon,
        verifiedPODs: podComplianceRate,
        billing: {
          unpaidCashAmount,
          unpaidCashCount: unpaidCashTrips.length,
          pendingCashCount: pendingCashTrips,
          unpaidCreditAmount,
          pendingVerificationSlipsCount: pendingBatchesCount.length
        }
      },
      recentTrips: tripsWithDetails,
      statusBreakdown,
      carbonChart,
      activeUnits: initialActiveUnits,
      liveTrips: activeTripsList,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Dashboard API Error:', error);
    const message = error instanceof Error ? error.message : 'ดึงข้อมูลล้มเหลว';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

