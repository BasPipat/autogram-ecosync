'use client';

import { useEffect, useState, useMemo } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { 
  Download, FileText, Loader2, Table, FileBarChart, 
  ShieldCheck, Leaf, LayoutDashboard, Calendar, BarChart3,
  Truck, Route, Fuel, ChevronRight
} from 'lucide-react';

type FilterType = 'day' | 'month' | 'year';

type Row = {
  monthKey: string;
  totalTrips: number;
  totalDistanceKm: number;
  totalFuelLitersForecast: number;
  totalEmissionKgCo2e: number;
  totalTonKm?: number;
  totalWeightTon?: number;
};

type ActivityData = {
  label: string;
  tripId: string;
  distanceKm: number;
  fuelForecastLiters: number;
  emissionKgCo2e: number;
};

// ── Executive PDF Export ──
async function downloadPdf(rows: Row[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  const colors = {
    emerald: [16, 185, 129] as [number, number, number],
    slate: [15, 23, 42] as [number, number, number],
    blue: [59, 130, 246] as [number, number, number],
    orange: [245, 158, 11] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    lightGray: [241, 245, 249] as [number, number, number],
  };

  doc.setFillColor(...colors.slate);
  doc.rect(0, 0, 210, 45, 'F');
  doc.setFontSize(22);
  doc.setTextColor(...colors.white);
  doc.text('AUTOGRAM ECO-SYNC', 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text('EXECUTIVE SUSTAINABILITY PERFORMANCE REPORT', 14, 28);
  const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(10);
  doc.text(`Report Generated: ${dateStr}`, 14, 38);
  
  const totalTrips = rows.reduce((s, r) => s + r.totalTrips, 0);
  const totalDist = rows.reduce((s, r) => s + r.totalDistanceKm, 0);
  const totalEmission = rows.reduce((s, r) => s + r.totalEmissionKgCo2e, 0);

  const drawCard = (x: number, y: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFillColor(...colors.lightGray);
    doc.roundedRect(x, y, 60, 25, 3, 3, 'F');
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(x, y + 25, x + 60, y + 25);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x + 5, y + 8);
    doc.setFontSize(14);
    doc.setTextColor(...colors.slate);
    doc.text(value, x + 5, y + 18);
  };

  drawCard(14, 55, 'Total Trips', totalTrips.toLocaleString(), colors.blue);
  drawCard(79, 55, 'Total Distance', `${totalDist.toLocaleString()} km`, colors.emerald);
  drawCard(144, 55, 'Carbon Emission', `${totalEmission.toFixed(2)} kgCO2e`, colors.orange);

  // Chart
  let y = 100;
  doc.setFontSize(14);
  doc.setTextColor(...colors.slate);
  doc.text('Carbon Emission Trend (kgCO2e)', 14, y);
  const maxVal = Math.max(...rows.map(r => r.totalEmissionKgCo2e), 10);
  const chartX = 20;
  const chartY = 150;
  const chartWidth = 170;
  const chartHeight = 40;
  doc.setDrawColor(200, 200, 200);
  doc.line(chartX, chartY, chartX + chartWidth, chartY);
  const barSpacing = chartWidth / Math.max(rows.length, 1);
  const barWidth = barSpacing * 0.6;

  rows.forEach((row, i) => {
    const bHeight = (row.totalEmissionKgCo2e / maxVal) * chartHeight;
    const bx = chartX + (i * barSpacing) + (barSpacing - barWidth) / 2;
    doc.setFillColor(...colors.emerald);
    doc.rect(bx, chartY - bHeight, barWidth, bHeight, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(row.monthKey, bx + (barWidth / 2), chartY + 5, { align: 'center' });
  });

  // Table
  y = 170;
  doc.setFontSize(14);
  doc.setTextColor(...colors.slate);
  doc.text('Monthly Sustainability Breakdown', 14, y);
  y += 8;
  doc.setFillColor(...colors.lightGray);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(9);
  doc.text('Month', 18, y + 5);
  doc.text('Trips', 60, y + 5);
  doc.text('Distance (km)', 90, y + 5);
  doc.text('Ton-KM', 130, y + 5);
  doc.text('Emission (kgCO2e)', 160, y + 5);
  y += 8;
  rows.forEach((row, i) => {
    if (i % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(14, y, 182, 7, 'F'); }
    doc.setFontSize(8);
    doc.text(row.monthKey, 18, y + 5);
    doc.text(String(row.totalTrips), 60, y + 5);
    doc.text(row.totalDistanceKm.toLocaleString(), 90, y + 5);
    doc.text(String(row.totalTonKm || 0), 130, y + 5);
    doc.text(row.totalEmissionKgCo2e.toFixed(2), 160, y + 5);
    y += 7;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  doc.save(`eco-sync-executive-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function downloadExcel(rows: Row[]) {
  const XLSX = await import('xlsx');
  const summaryData = rows.map(r => ({
    'Month': r.monthKey,
    'Trips': r.totalTrips,
    'Distance (km)': r.totalDistanceKm,
    'Weight (Ton)': r.totalWeightTon || 0,
    'Ton-KM': r.totalTonKm || 0,
    'Emission (kgCO2e)': r.totalEmissionKgCo2e,
  }));
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Monthly Summary');
  XLSX.writeFile(wb, `eco-sync-compliance-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function getDefaultValue(filter: FilterType) {
  const now = new Date();
  if (filter === 'day') return now.toISOString().slice(0, 10);
  if (filter === 'month') return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return String(now.getUTCFullYear());
}

export default function CarbonIntelligencePage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'ledger'>('analytics');
  const [filter, setFilter] = useState<FilterType>('month');
  const [value, setValue] = useState(getDefaultValue('month'));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [setting, setSetting] = useState<any>(null);

  const fetchUnifiedData = async (f: FilterType, v: string) => {
    setLoading(true);
    try {
      const actRes = await fetch(`/api/carbon/activity?filter=${encodeURIComponent(f)}&value=${encodeURIComponent(v)}`, { cache: 'no-store' });
      const actJson = await actRes.json();
      setActivities(actJson.chart || []);
      setSetting(actJson.setting);
      
      const repRes = await fetch('/api/report-center/monthly', { cache: 'no-store' });
      const repJson = await repRes.json();
      setRows(repJson.rows || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUnifiedData(filter, value);
  }, []);

  const onApplyFilter = () => fetchUnifiedData(filter, value);

  const totalStats = useMemo(() => {
    return {
      trips: rows.reduce((s, r) => s + r.totalTrips, 0),
      distance: rows.reduce((s, r) => s + r.totalDistanceKm, 0),
      emission: rows.reduce((s, r) => s + r.totalEmissionKgCo2e, 0),
    };
  }, [rows]);

  const maxActivityEmission = useMemo(() => Math.max(...activities.map(a => a.emissionKgCo2e), 1), [activities]);

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)' }}>
        
        <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <FileBarChart size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Carbon Intelligence</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Unified Analytics & ESG Sustainability Reporting</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadExcel(rows)} className="btn-secondary px-4 py-2 rounded-xl text-[13px] flex items-center gap-2">
              <Table size={14} /> Export Excel
            </button>
            <button onClick={() => downloadPdf(rows)} className="btn-primary px-4 py-2 rounded-xl text-[13px] flex items-center gap-2">
              <FileText size={14} /> Executive PDF
            </button>
          </div>
        </div>

        <div className="card p-2 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button onClick={() => setActiveTab('analytics')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'analytics' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Analytics</button>
            <button onClick={() => setActiveTab('ledger')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'ledger' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Monthly Ledger</button>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select value={filter} onChange={(e) => { setFilter(e.target.value as FilterType); setValue(getDefaultValue(e.target.value as FilterType)); }} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none">
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
            <input type={filter === 'day' ? 'date' : filter === 'month' ? 'month' : 'number'} value={value} onChange={(e) => setValue(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[12px] outline-none" />
            <button onClick={onApplyFilter} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-[12px] font-bold">Apply</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {[
            { label: 'Total Trips', value: totalStats.trips.toLocaleString(), icon: Truck, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Total Distance', value: `${totalStats.distance.toLocaleString()} km`, icon: Route, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Total Emission', value: `${totalStats.emission.toFixed(2)} kgCO₂e`, icon: Leaf, color: '#F59E0B', bg: '#FFF7ED' },
          ].map(card => (
            <div key={card.label} className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">{card.label}</p>
                <p className="text-[20px] font-bold text-slate-800">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500 mr-2" />
            <span className="text-slate-400">Processing Analytics Data...</span>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'analytics' ? (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 size={18} className="text-emerald-500" />
                  <span className="text-[15px] font-bold text-slate-800">Carbon Activity Tracking</span>
                </div>
                {activities.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 italic">No data found for this period.</div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((item) => (
                      <div key={`${item.tripId}-${item.label}`} className="grid grid-cols-[120px_1fr_100px] items-center gap-4">
                        <span className="text-[11px] font-bold text-slate-500 truncate">{item.label}</span>
                        <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${(item.emissionKgCo2e / maxActivityEmission) * 100}%` }} />
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 text-right">{item.emissionKgCo2e.toLocaleString()} <span className="text-[9px] text-slate-400">kg</span></span>
                      </div>
                    ))}
                  </div>
                )}
                {setting && (
                  <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      <strong>Methodology:</strong> Calculated using <strong>{setting.standardReference}</strong> standard. 
                      Formula: Distance / {setting.fuelEfficiencyKmPerLiterDefault} km/L × {setting.emissionFactorKgCo2PerLiter} kgCO₂e/L.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                  <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Sustainability Ledger</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="p-4">Month</th>
                        <th className="p-4">Trips</th>
                        <th className="p-4">Distance (km)</th>
                        <th className="p-4">Fuel (L)</th>
                        <th className="p-4">Emission (kgCO₂e)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.monthKey} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                          <td className="p-4 font-bold text-slate-700">{r.monthKey}</td>
                          <td className="p-4 text-slate-500">{r.totalTrips}</td>
                          <td className="p-4 text-slate-500">{r.totalDistanceKm.toLocaleString()}</td>
                          <td className="p-4 text-slate-500">{r.totalFuelLitersForecast.toLocaleString()}</td>
                          <td className="p-4 font-bold text-emerald-600">{r.totalEmissionKgCo2e.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-400 italic">
          <ShieldCheck size={14} className="text-emerald-500" />
          Data verified by GPS route tracking and TGO-certified emission factors.
        </div>
      </div>
    </SidebarLayout>
  );
}
