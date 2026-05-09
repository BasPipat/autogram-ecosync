import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Trip } from '@/models/Trip';
import { MonthlyCarbonLedger } from '@/models/MonthlyCarbonLedger';
import { ObjectId } from 'mongodb';
import { generateMonthlyLedgers, getActiveMasterSetting, getRangeFromFilter } from '@/lib/carbon-ledger';
import { getSessionToken, isInternalRole } from '@/lib/access';

export const dynamic = 'force-dynamic';

function asNumber(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    await generateMonthlyLedgers();

    const url = new URL(req.url);
    const filter = (url.searchParams.get('filter') || 'month') as 'day' | 'month' | 'year' | 'custom';

    const now = new Date();
    const defaultValue =
      filter === 'day'
        ? now.toISOString().slice(0, 10)
        : filter === 'month'
          ? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
          : String(now.getUTCFullYear());

    const value = url.searchParams.get('value') || defaultValue;
    
    let start: Date;
    let end: Date;

    if (filter === 'custom') {
      start = new Date(url.searchParams.get('start') || defaultValue);
      end = new Date(url.searchParams.get('end') || defaultValue);
      end.setHours(23, 59, 59, 999); // Include the entire end day
    } else {
      const range = getRangeFromFilter(filter as any, value);
      start = range.start;
      end = range.end;
    }
    const setting = await getActiveMasterSetting();

    const trips = await Trip.find({
      ...(isInternalRole(token.role) ? {} : { companyId: new ObjectId(token.companyId) }),
      createdAt: { $gte: start, $lt: end },
    }).sort({ createdAt: 1 }).lean();
    const points = trips.map((trip) => {
      const distance = asNumber(trip.distance, 0);
      const fuelForecast = distance / asNumber(setting.fuelEfficiencyKmPerLiterDefault, 1);
      const emission = fuelForecast * asNumber(setting.emissionFactorKgCo2PerLiter, 0);
      return {
        label: new Date(trip.createdAt as Date).toISOString().slice(0, 10),
        tripId: trip.tripId,
        originName: trip.origin?.name || '-',
        destinationName: trip.destination?.name || '-',
        weightTon: asNumber(trip.weight, 0),
        distanceKm: Number(distance.toFixed(2)),
        fuelForecastLiters: Number(fuelForecast.toFixed(2)),
        emissionKgCo2e: Number(emission.toFixed(2)),
      };
    });

    const totals = points.reduce(
      (acc, item) => {
        acc.totalDistanceKm += item.distanceKm;
        acc.totalFuelForecastLiters += item.fuelForecastLiters;
        acc.totalEmissionKgCo2e += item.emissionKgCo2e;
        return acc;
      },
      { totalDistanceKm: 0, totalFuelForecastLiters: 0, totalEmissionKgCo2e: 0 }
    );

    const from10Years = new Date(now.getUTCFullYear() - 10, now.getUTCMonth(), 1);
    const monthlyLedger = await MonthlyCarbonLedger.find({ generatedAt: { $gte: from10Years } })
      .sort({ year: 1, month: 1 })
      .lean();

    return NextResponse.json({
      filter,
      value,
      setting: {
        fuelEfficiencyKmPerLiterDefault: setting.fuelEfficiencyKmPerLiterDefault,
        emissionFactorKgCo2PerLiter: setting.emissionFactorKgCo2PerLiter,
        standardReference: setting.standardReference,
      },
      summary: {
        totalTrips: points.length,
        totalDistanceKm: Number(totals.totalDistanceKm.toFixed(2)),
        totalFuelForecastLiters: Number(totals.totalFuelForecastLiters.toFixed(2)),
        totalEmissionKgCo2e: Number(totals.totalEmissionKgCo2e.toFixed(2)),
      },
      chart: points,
      monthlyLedger: monthlyLedger.map((m) => ({
        monthKey: m.monthKey,
        totalTrips: m.totalTrips,
        totalDistanceKm: m.totalDistanceKm,
        totalFuelLitersForecast: m.totalFuelLitersForecast,
        totalEmissionKgCo2e: m.totalEmissionKgCo2e,
      })),
    });
  } catch (error) {
    console.error('carbon activity error', error);
    return NextResponse.json({ error: 'ไม่สามารถสร้าง Carbon Activity ได้' }, { status: 500 });
  }
}
