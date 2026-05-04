'use client';

import { useEffect, useMemo, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Leaf, Loader2 } from 'lucide-react';

type FilterType = 'day' | 'month' | 'year';

type ApiData = {
  filter: FilterType;
  value: string;
  summary: {
    totalTrips: number;
    totalDistanceKm: number;
    totalFuelForecastLiters: number;
    totalEmissionKgCo2e: number;
  };
  setting: {
    fuelEfficiencyKmPerLiterDefault: number;
    emissionFactorKgCo2PerLiter: number;
    standardReference: string;
  };
  chart: Array<{
    label: string;
    tripId: string;
    distanceKm: number;
    fuelForecastLiters: number;
    emissionKgCo2e: number;
  }>;
  monthlyLedger: Array<{
    monthKey: string;
    totalTrips: number;
    totalDistanceKm: number;
    totalFuelLitersForecast: number;
    totalEmissionKgCo2e: number;
  }>;
};

function getDefaultValue(filter: FilterType) {
  const now = new Date();
  if (filter === 'day') return now.toISOString().slice(0, 10);
  if (filter === 'month') return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return String(now.getUTCFullYear());
}

export default function CarbonActivityPage() {
  const [filter, setFilter] = useState<FilterType>('month');
  const [value, setValue] = useState(getDefaultValue('month'));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiData | null>(null);

  const fetchData = async (f: FilterType, v: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/carbon/activity?filter=${encodeURIComponent(f)}&value=${encodeURIComponent(v)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filter, value);
  }, []);

  const maxEmission = useMemo(
    () => Math.max(...(data?.chart.map((c) => c.emissionKgCo2e) || [1])),
    [data]
  );

  const onFilterChange = (nextFilter: FilterType) => {
    const nextValue = getDefaultValue(nextFilter);
    setFilter(nextFilter);
    setValue(nextValue);
    fetchData(nextFilter, nextValue);
  };

  const onApply = () => fetchData(filter, value);

  return (
    <SidebarLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carbon Activity</h1>
          <p className="text-sm text-slate-500">กรองรายวัน/รายเดือน/รายปี ย้อนหลังสูงสุด 10 ปี + Fuel Forecast</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 grid md:grid-cols-4 gap-3">
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as FilterType)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="day">รายวัน</option>
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
          </select>
          {filter === 'day' && (
            <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          )}
          {filter === 'month' && (
            <input type="month" value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          )}
          {filter === 'year' && (
            <input
              type="number"
              min={new Date().getUTCFullYear() - 10}
              max={new Date().getUTCFullYear()}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          )}
          <button onClick={onApply} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
            Apply Filter
          </button>
        </div>

        {loading ? (
          <div className="h-40 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> กำลังโหลดข้อมูล...
          </div>
        ) : data ? (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Trips</p>
                <p className="text-2xl font-bold text-slate-900">{data.summary.totalTrips}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Distance (km)</p>
                <p className="text-2xl font-bold text-slate-900">{data.summary.totalDistanceKm}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Fuel Forecast (L)</p>
                <p className="text-2xl font-bold text-cyan-700">{data.summary.totalFuelForecastLiters}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Emission (kgCO2e)</p>
                <p className="text-2xl font-bold text-emerald-700">{data.summary.totalEmissionKgCo2e}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Leaf className="w-4 h-4 text-emerald-600" /> Carbon Activity Graph
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fuel formula: Distance / {data.setting.fuelEfficiencyKmPerLiterDefault} km/L, EF: {data.setting.emissionFactorKgCo2PerLiter} ({data.setting.standardReference})
              </p>
              <div className="mt-4 space-y-2">
                {data.chart.length === 0 ? (
                  <p className="text-sm text-slate-400">ไม่มีข้อมูลในช่วงที่เลือก</p>
                ) : (
                  data.chart.map((item) => (
                    <div key={`${item.tripId}-${item.label}`} className="grid grid-cols-[140px_1fr_90px] items-center gap-3">
                      <span className="text-xs text-slate-500 truncate">{item.label}</span>
                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.max(5, (item.emissionKgCo2e / maxEmission) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-700 text-right">{item.emissionKgCo2e}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-900">Monthly Carbon Activity Ledger (Auto Saved)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3 text-left">Month</th>
                      <th className="p-3 text-left">Trips</th>
                      <th className="p-3 text-left">Distance</th>
                      <th className="p-3 text-left">Fuel Forecast</th>
                      <th className="p-3 text-left">Emission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyLedger.slice(-24).reverse().map((row) => (
                      <tr key={row.monthKey} className="border-t border-slate-100">
                        <td className="p-3 font-medium">{row.monthKey}</td>
                        <td className="p-3">{row.totalTrips}</td>
                        <td className="p-3">{row.totalDistanceKm}</td>
                        <td className="p-3">{row.totalFuelLitersForecast}</td>
                        <td className="p-3 text-emerald-700 font-medium">{row.totalEmissionKgCo2e}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </SidebarLayout>
  );
}
