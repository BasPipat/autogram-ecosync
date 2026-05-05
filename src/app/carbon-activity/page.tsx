'use client';

import { useEffect, useMemo, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Leaf, Loader2, AlertCircle } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiData | null>(null);
  const [displayedLedgerCount, setDisplayedLedgerCount] = useState(12);

  const fetchData = async (f: FilterType, v: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/carbon/activity?filter=${encodeURIComponent(f)}&value=${encodeURIComponent(v)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch carbon data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
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
    setDisplayedLedgerCount(12);
    fetchData(nextFilter, nextValue);
  };

  const onApply = () => {
    setDisplayedLedgerCount(12);
    fetchData(filter, value);
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#F5F5F7] p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Carbon Activity</h1>
          <p className="text-slate-500">Track emissions by filtering daily, monthly, or yearly data</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 grid md:grid-cols-4 gap-3 shadow-sm">
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as FilterType)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>

          {filter === 'day' && (
            <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20" />
          )}
          {filter === 'month' && (
            <input type="month" value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20" />
          )}
          {filter === 'year' && (
            <input
              type="number"
              min={new Date().getUTCFullYear() - 10}
              max={new Date().getUTCFullYear()}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
            />
          )}
          <button onClick={onApply} className="rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669] transition-colors">
            Apply
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-900">Error loading data</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-40 rounded-2xl border border-slate-100 bg-white flex items-center justify-center text-slate-500 shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : data ? (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-slate-500 font-medium">Total Trips</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{data.summary.totalTrips}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-slate-500 font-medium">Distance (km)</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{data.summary.totalDistanceKm}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-slate-500 font-medium">Fuel Forecast (L)</p>
                <p className="text-2xl font-bold text-cyan-700 mt-2">{data.summary.totalFuelForecastLiters}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-slate-500 font-medium">Emission (kgCO₂e)</p>
                <p className="text-2xl font-bold text-[#10b981] mt-2">{data.summary.totalEmissionKgCo2e}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
                <Leaf className="w-5 h-5 text-[#10b981]" /> Carbon Activity Graph
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Fuel formula: Distance / {data.setting.fuelEfficiencyKmPerLiterDefault} km/L, Emission factor: {data.setting.emissionFactorKgCo2PerLiter} ({data.setting.standardReference})
              </p>
              <div className="space-y-2">
                {data.chart.length === 0 ? (
                  <p className="text-sm text-slate-500">No data for selected period</p>
                ) : (
                  data.chart.map((item) => (
                    <div key={`${item.tripId}-${item.label}`} className="grid grid-cols-[140px_1fr_90px] items-center gap-3">
                      <span className="text-xs text-slate-600 truncate">{item.label}</span>
                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#10b981]"
                          style={{ width: `${Math.max(5, (item.emissionKgCo2e / maxEmission) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-700 text-right">{item.emissionKgCo2e}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-900 flex justify-between items-center">
                <span>Monthly Carbon Activity Ledger</span>
                <span className="text-xs font-normal text-slate-500">Last {displayedLedgerCount} months</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 text-left font-medium">Month</th>
                      <th className="p-3 text-left font-medium">Trips</th>
                      <th className="p-3 text-left font-medium">Distance (km)</th>
                      <th className="p-3 text-left font-medium">Fuel (L)</th>
                      <th className="p-3 text-left font-medium">Emission (kgCO₂e)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyLedger.slice(-displayedLedgerCount).reverse().map((row) => (
                      <tr key={row.monthKey} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-900">{row.monthKey}</td>
                        <td className="p-3 text-slate-700">{row.totalTrips}</td>
                        <td className="p-3 text-slate-700">{row.totalDistanceKm}</td>
                        <td className="p-3 text-slate-700">{row.totalFuelLitersForecast}</td>
                        <td className="p-3 text-[#10b981] font-medium">{row.totalEmissionKgCo2e}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.monthlyLedger.length > displayedLedgerCount && (
                <div className="px-6 py-4 border-t border-slate-100 text-center">
                  <button
                    onClick={() => setDisplayedLedgerCount(prev => Math.min(prev + 12, data.monthlyLedger.length))}
                    className="text-sm font-medium text-[#10b981] hover:text-[#059669] transition-colors"
                  >
                    Load More ({data.monthlyLedger.length - displayedLedgerCount} remaining)
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </SidebarLayout>
  );
}
