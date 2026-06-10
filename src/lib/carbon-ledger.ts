import { Trip } from '@/models/Trip';
import { Setting } from '@/models/Setting';
import { MonthlyCarbonLedger } from '@/models/MonthlyCarbonLedger';

const TEN_YEARS = 10;

function to2(value: number): number {
  return Number(value.toFixed(2));
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function getActiveMasterSetting() {
  const setting = await Setting.findOne({ isActive: true, scope: 'global', key: 'master-default' }).sort({ effectiveFrom: -1 }).lean();
  if (setting) {
    if (setting.fuelEfficiencyKmPerLiterDefault === undefined) {
      setting.fuelEfficiencyKmPerLiterDefault = 3.0;
    }
    return setting;
  }
  return {
    fuelEfficiencyKmPerLiterDefault: 3.0,
    emissionFactorKgCo2PerLiter: 2.68,
    standardReference: 'TGO',
  };
}

export async function generateMonthlyLedgers() {
  const now = new Date();
  const from = new Date(now.getFullYear() - TEN_YEARS, now.getMonth(), 1);
  const setting = await getActiveMasterSetting();

  const monthly = await Trip.aggregate([
    { $match: { createdAt: { $gte: from } } },
    {
      $group: {
        _id: { 
          y: { $year: '$createdAt' }, 
          m: { $month: '$createdAt' },
          companyId: '$companyId',
          companyName: '$companyName'
        },
        totalTrips: { $sum: 1 },
        totalDistanceKm: { $sum: { $ifNull: ['$distance', 0] } },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);

  const writes = monthly.map((item) => {
    const year = item._id.y;
    const month = item._id.m;
    const companyId = item._id.companyId;
    const companyName = item._id.companyName;
    const distance = Number(item.totalDistanceKm || 0);
    const fuelForecast = distance / Number(setting.fuelEfficiencyKmPerLiterDefault || 1);
    const emission = fuelForecast * Number(setting.emissionFactorKgCo2PerLiter || 0);
    return {
      updateOne: {
        filter: { 
          monthKey: monthKey(year, month),
          companyId: companyId,
          companyName: companyName
        },
        update: {
          $set: {
            year,
            month,
            monthKey: monthKey(year, month),
            companyId,
            companyName,
            totalTrips: Number(item.totalTrips || 0),
            totalDistanceKm: to2(distance),
            totalFuelLitersForecast: to2(fuelForecast),
            totalEmissionKgCo2e: to2(emission),
            generatedAt: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  if (writes.length) {
    await MonthlyCarbonLedger.bulkWrite(writes);
  }
}

export function getRangeFromFilter(filter: 'day' | 'month' | 'year', value: string) {
  if (filter === 'day') {
    const start = new Date(`${value}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }
  if (filter === 'month') {
    const [y, m] = value.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    return { start, end };
  }
  const y = Number(value);
  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y + 1, 0, 1));
  return { start, end };
}
