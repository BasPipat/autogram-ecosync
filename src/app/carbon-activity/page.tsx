'use client';

import { useEffect, useMemo, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Leaf, Loader2, AlertCircle, BarChart3, Truck, Route, Fuel, Flame } from 'lucide-react';

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

  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-md)',
  };

  const summaryCards = data ? [
    { label: 'Total Trips', value: data.summary.totalTrips, icon: Truck, gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', iconColor: '#3B82F6' },
    { label: 'Distance (km)', value: data.summary.totalDistanceKm, icon: Route, gradient: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', iconColor: '#8B5CF6' },
    { label: 'Fuel Forecast (L)', value: data.summary.totalFuelForecastLiters, icon: Fuel, gradient: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', iconColor: '#F97316' },
    { label: 'Emission (kgCO₂e)', value: data.summary.totalEmissionKgCo2e, icon: Leaf, gradient: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', iconColor: '#10B981' },
  ] : [];

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)' }}>
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Carbon Activity</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Track emissions by filtering daily, monthly, or yearly data
          </p>
        </div>

        {/* Filter Bar */}
        <div className="card p-4 grid md:grid-cols-4 gap-3 animate-fade-in">
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as FilterType)}
            className="px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
            style={inputStyle}
          >
            <option value="day">Daily</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>

          {filter === 'day' && (
            <input type="date" value={value} onChange={(e) => setValue(e.target.value)}
              className="px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
          )}
          {filter === 'month' && (
            <input type="month" value={value} onChange={(e) => setValue(e.target.value)}
              className="px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
          )}
          {filter === 'year' && (
            <input
              type="number"
              min={new Date().getUTCFullYear() - 10}
              max={new Date().getUTCFullYear()}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
              style={inputStyle}
            />
          )}
          <button
            onClick={onApply}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Apply
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="card p-4 flex items-start gap-3"
            style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
          >
            <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-semibold text-[13px]" style={{ color: '#991B1B' }}>Error loading data</p>
              <p className="text-[12px]" style={{ color: '#DC2626' }}>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin mr-2" style={{ color: 'var(--accent)' }} />
            <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4 stagger">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="glass-card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>{card.label}</p>
                        <p className="text-2xl font-bold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                      </div>
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: card.gradient }}
                      >
                        <Icon size={16} style={{ color: card.iconColor }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart */}
            <div className="card p-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>Carbon Activity Graph</span>
              </div>
              <p className="text-[11px] mb-5" style={{ color: 'var(--text-tertiary)' }}>
                Fuel formula: Distance / {data.setting.fuelEfficiencyKmPerLiterDefault} km/L, Emission factor: {data.setting.emissionFactorKgCo2PerLiter} ({data.setting.standardReference})
              </p>
              <div className="space-y-2.5">
                {data.chart.length === 0 ? (
                  <p className="text-[13px] py-4" style={{ color: 'var(--text-tertiary)' }}>No data for selected period</p>
                ) : (
                  data.chart.map((item) => (
                    <div key={`${item.tripId}-${item.label}`} className="grid grid-cols-[140px_1fr_90px] items-center gap-3">
                      <span className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(5, (item.emissionKgCo2e / maxEmission) * 100)}%`,
                            background: 'linear-gradient(90deg, #10B981, #34D399)',
                          }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{item.emissionKgCo2e}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ledger Table */}
            <div className="card overflow-hidden animate-fade-in">
              <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>Monthly Carbon Activity Ledger</span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--border-light)', color: 'var(--text-tertiary)' }}>
                  Last {displayedLedgerCount} months
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: 'var(--bg-base)' }}>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Month</th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Trips</th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Distance (km)</th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Fuel (L)</th>
                      <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Emission (kgCO₂e)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyLedger.slice(-displayedLedgerCount).reverse().map((row) => (
                      <tr
                        key={row.monthKey}
                        className="transition-colors"
                        style={{ borderTop: '1px solid var(--border-light)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--border-light)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <td className="p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.monthKey}</td>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{row.totalTrips}</td>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{row.totalDistanceKm}</td>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{row.totalFuelLitersForecast}</td>
                        <td className="p-3 font-semibold" style={{ color: 'var(--accent)' }}>{row.totalEmissionKgCo2e}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.monthlyLedger.length > displayedLedgerCount && (
                <div className="px-6 py-4 text-center" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => setDisplayedLedgerCount(prev => Math.min(prev + 12, data.monthlyLedger.length))}
                    className="text-[13px] font-semibold transition-colors"
                    style={{ color: 'var(--accent)' }}
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
