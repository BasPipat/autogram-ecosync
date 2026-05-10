export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { MonthlyCarbonLedger } from '@/models/MonthlyCarbonLedger';
import { Trip } from '@/models/Trip';
import { ObjectId } from 'mongodb';
import { getSessionToken, isInternalRole } from '@/lib/access';
import { getActiveMasterSetting } from '@/lib/carbon-ledger';


export async function GET(req: NextRequest) {
  try {
    const token = await getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    let rows: any[] = [];
    if (isInternalRole(token.role)) {
      rows = await MonthlyCarbonLedger.find({}).sort({ year: -1, month: -1 }).limit(120).lean();
    } else {
      const setting = await getActiveMasterSetting();
      const grouped = await Trip.aggregate([
        { $match: { companyId: new ObjectId(token.companyId) } },
        {
          $group: {
            _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            totalTrips: { $sum: 1 },
            totalDistanceKm: { $sum: { $ifNull: ['$distance', 0] } },
          },
        },
        { $sort: { '_id.y': -1, '_id.m': -1 } },
        { $limit: 120 },
      ]);
      rows = grouped.map((g) => {
        const fuel = Number(g.totalDistanceKm || 0) / Number(setting.fuelEfficiencyKmPerLiterDefault || 1);
        const emission = fuel * Number(setting.emissionFactorKgCo2PerLiter || 0);
        return {
          monthKey: `${g._id.y}-${String(g._id.m).padStart(2, '0')}`,
          totalTrips: g.totalTrips,
          totalDistanceKm: Number(Number(g.totalDistanceKm || 0).toFixed(2)),
          totalFuelLitersForecast: Number(fuel.toFixed(2)),
          totalEmissionKgCo2e: Number(emission.toFixed(2)),
        };
      });
    }

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('report-center monthly error', error);
    return NextResponse.json({ error: 'ดึงรายงานรายเดือนไม่สำเร็จ' }, { status: 500 });
  }
}
