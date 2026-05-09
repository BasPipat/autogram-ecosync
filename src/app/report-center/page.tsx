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
  label: string; // Date string
  tripId: string;
  originName: string;
  destinationName: string;
  weightTon: number;
  distanceKm: number;
  fuelForecastLiters: number;
  emissionKgCo2e: number;
};

// ── Clean & Bright PDF Export ──
async function downloadPdf(filter: FilterType, activities: ActivityData[], rows: Row[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  const colors = {
    emerald: [16, 185, 129] as [number, number, number],
    slate: [15, 23, 42] as [number, number, number],
    blue: [59, 130, 246] as [number, number, number],
    orange: [245, 158, 11] as [number, number, number],
    gray: [100, 116, 139] as [number, number, number],
    lightGray: [248, 250, 252] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  // ── Header (Bright & Clean) ──
  doc.setFillColor(...colors.white);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Brand Accent Circle
  doc.setFillColor(...colors.emerald);
  doc.circle(18, 18, 4, 'F');
  
  doc.setFontSize(22);
  doc.setTextColor(...colors.slate);
  doc.text('AUTOGRAM ECO-SYNC', 26, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(...colors.emerald);
  doc.text('CARBON INTELLIGENCE PLATFORM', 26, 26);
  
  doc.setDrawColor(...colors.emerald);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // Report Info (Right Aligned)
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  doc.text(`REPORT: ${filter.toUpperCase()} SUSTAINABILITY VIEW`, 196, 18, { align: 'right' });
  doc.text(`GENERATED: ${new Date().toLocaleString('th-TH')}`, 196, 23, { align: 'right' });

  // ── Summary Metrics (Colorful Cards) ──
  const totalEmission = activities.reduce((s, a) => s + a.emissionKgCo2e, 0);
  const totalTrips = activities.length;
  const totalDist = activities.reduce((s, a) => s + a.distanceKm, 0);

  const drawCard = (x: number, y: number, label: string, value: string, color: [number, number, number], bgColor: [number, number, number]) => {
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y, 58, 22, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    doc.text(label.toUpperCase(), x + 5, y + 8);
    doc.setFontSize(12);
    doc.setTextColor(...color);
    doc.text(value, x + 5, y + 16);
  };

  drawCard(14, 40, 'Selected Trips', totalTrips.toLocaleString(), colors.blue, [239, 246, 255]);
  drawCard(76, 40, 'Total Distance', `${totalDist.toFixed(2)} km`, colors.emerald, [236, 253, 245]);
  drawCard(138, 40, 'Carbon Emission', `${totalEmission.toFixed(2)} kgCO2e`, colors.orange, [255, 247, 237]);

  // ── Visual Carbon Chart (Bar Chart) ──
  let y = 72;
  doc.setFontSize(10);
  doc.setTextColor(...colors.slate);
  doc.text('CARBON EMISSION PERFORMANCE TREND', 14, y);
  
  const chartX = 14;
  const chartY = y + 35;
  const chartWidth = 182;
  const chartHeight = 25;
  
  // Draw Background Grid
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.1);
  for (let i = 0; i <= 4; i++) {
    const gy = chartY - (i * (chartHeight / 4));
    doc.line(chartX, gy, chartX + chartWidth, gy);
  }

  // Determine chart data (Limit to top 15 points for clarity if many)
  const chartPoints = activities.slice(0, 15);
  const maxEmission = Math.max(...chartPoints.map(p => p.emissionKgCo2e), 1);
  const barWidth = (chartWidth / Math.max(chartPoints.length, 1)) * 0.7;
  const spacing = (chartWidth / Math.max(chartPoints.length, 1));

  chartPoints.forEach((p, i) => {
    const bHeight = (p.emissionKgCo2e / maxEmission) * chartHeight;
    const bx = chartX + (i * spacing) + (spacing - barWidth) / 2;
    
    // Bar
    doc.setFillColor(...colors.emerald);
    doc.rect(bx, chartY - bHeight, barWidth, bHeight, 'F');
    
    // X Label
    doc.setFontSize(6);
    doc.setTextColor(...colors.gray);
    const label = filter === 'day' ? p.tripId.slice(-4) : p.label.slice(-5);
    doc.text(label, bx + (barWidth / 2), chartY + 4, { align: 'center' });
  });

  // Base Line
  doc.setDrawColor(...colors.slate);
  doc.setLineWidth(0.2);
  doc.line(chartX, chartY, chartX + chartWidth, chartY);

  // ── Main Content ──
  y = 120;
  doc.setFontSize(11);
  doc.setTextColor(...colors.slate);
  doc.text('Data Ledger Details', 14, y);
  
  // Determine report rows
  let reportRows: any[] = [];
  let headers: string[] = [];

  if (filter === 'day') {
    headers = ['Trip ID', 'Origin / Destination', 'Distance', 'Weight', 'Emission'];
    reportRows = activities.map(a => ({
      c1: a.tripId,
      c2: `${a.originName} -> ${a.destinationName}`,
      c3: `${a.distanceKm} km`,
      c4: `${a.weightTon} ton`,
      c5: `${a.emissionKgCo2e} kg`
    }));
  } else if (filter === 'month') {
    headers = ['Date', 'Total Trips', 'Distance (km)', 'Emission (kgCO2e)'];
    const dailyMap: Record<string, any> = {};
    activities.forEach(a => {
      if (!dailyMap[a.label]) dailyMap[a.label] = { label: a.label, trips: 0, dist: 0, emission: 0 };
      dailyMap[a.label].trips += 1;
      dailyMap[a.label].dist += a.distanceKm;
      dailyMap[a.label].emission += a.emissionKgCo2e;
    });
    reportRows = Object.values(dailyMap).sort((a, b) => a.label.localeCompare(b.label)).map(d => ({
      c1: d.label,
      c2: String(d.trips),
      c3: d.dist.toFixed(2),
      c4: d.emission.toFixed(2)
    }));
  } else {
    headers = ['Month', 'Trips', 'Distance (km)', 'Emission (kgCO2e)'];
    reportRows = rows.map(r => ({
      c1: r.monthKey,
      c2: String(r.totalTrips),
      c3: r.totalDistanceKm.toLocaleString(),
      c4: r.totalEmissionKgCo2e.toFixed(2)
    }));
  }

  // Table Styling
  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  headers.forEach((h, i) => doc.text(h, 18 + (i * 38), y + 5));

  y += 8;
  doc.setTextColor(...colors.slate);
  reportRows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 253, 254);
      doc.rect(14, y, 182, 7, 'F');
    }
    doc.text(row.c1, 18, y + 5);
    doc.text(row.c2, 56, y + 5, { maxWidth: 35 });
    doc.text(row.c3, 94, y + 5);
    doc.text(row.c4, 132, y + 5);
    if (row.c5) doc.text(row.c5, 170, y + 5);
    y += 7;
    if (y > 275) { doc.addPage(); y = 20; }
  });

  // ── Footer ──
  const footerY = 285;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY - 5, 196, footerY - 5);
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text('Report verified via TGO activity-based methodology. All distances are GPS-verified.', 14, footerY);
  doc.text('© 2026 Autogram Eco-Sync', 196, footerY, { align: 'right' });

  doc.save(`eco-sync-${filter}-clean-report.pdf`);
}

async function downloadExcel(filter: FilterType, activities: ActivityData[], rows: Row[]) {
  const XLSX = await import('xlsx');
  let data: any[] = [];

  if (filter === 'day') {
    data = activities.map(a => ({
      'Trip ID': a.tripId,
      'Origin': a.originName,
      'Destination': a.destinationName,
      'Weight (Ton)': a.weightTon,
      'Distance (km)': a.distanceKm,
      'Emission (kgCO2e)': a.emissionKgCo2e
    }));
  } else if (filter === 'month') {
    const dailyMap: Record<string, any> = {};
    activities.forEach(a => {
      if (!dailyMap[a.label]) dailyMap[a.label] = { 'Date': a.label, 'Trips': 0, 'Distance': 0, 'Emission': 0 };
      dailyMap[a.label]['Trips'] += 1;
      dailyMap[a.label]['Distance'] += a.distanceKm;
      dailyMap[a.label]['Emission'] += a.emissionKgCo2e;
    });
    data = Object.values(dailyMap).sort((a, b) => a.Date.localeCompare(b.Date));
  } else {
    data = rows.map(r => ({
      'Month': r.monthKey,
      'Trips': r.totalTrips,
      'Distance (km)': r.totalDistanceKm,
      'Emission (kgCO2e)': r.totalEmissionKgCo2e
    }));
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `eco-sync-${filter}-report.xlsx`);
}

function getDefaultValue(filter: FilterType) {
  const now = new Date();
  if (filter === 'day') return now.toISOString().slice(0, 10);
  if (filter === 'month') return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return String(now.getUTCFullYear());
}

export default function CarbonIntelligencePage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'ledger'>('analytics');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [setting, setSetting] = useState<any>(null);

  const fetchUnifiedData = async (start: string, end: string) => {
    setLoading(true);
    try {
      // Logic for view mode based on range
      const s = new Date(start);
      const e = new Date(end);
      const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      
      let filter: FilterType = 'day';
      if (diffDays > 31) filter = 'month';
      if (diffDays > 366) filter = 'year';

      // Use a custom query for range
      const actRes = await fetch(`/api/carbon/activity?filter=custom&start=${start}&end=${end}`, { cache: 'no-store' });
      const actJson = await actRes.json();
      setActivities(actJson.chart || []);
      setSetting(actJson.setting);
      
      // We can reuse the monthly ledger for the table if needed, or group activities
      const repRes = await fetch('/api/report-center/monthly', { cache: 'no-store' });
      const repJson = await repRes.json();
      setRows(repJson.rows || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUnifiedData(startDate, endDate);
  }, []);

  const onApplyFilter = () => fetchUnifiedData(startDate, endDate);

  // Determine current filter for exports
  const currentFilter = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) return 'year';
    if (diffDays > 31) return 'month';
    return 'day';
  }, [startDate, endDate]);

  const totalStats = useMemo(() => {
    const currentActivities = activities;
    return {
      trips: currentActivities.length,
      distance: currentActivities.reduce((s, a) => s + a.distanceKm, 0),
      emission: currentActivities.reduce((s, a) => s + a.emissionKgCo2e, 0),
    };
  }, [activities]);

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
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Unified Analytics & Dynamic ESG Reporting</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadExcel(currentFilter, activities, rows)} className="btn-secondary px-4 py-2 rounded-xl text-[13px] flex items-center gap-2">
              <Table size={14} /> Export Excel
            </button>
            <button onClick={() => downloadPdf(currentFilter, activities, rows)} className="btn-primary px-4 py-2 rounded-xl text-[13px] flex items-center gap-2">
              <FileText size={14} /> Executive PDF
            </button>
          </div>
        </div>

        <div className="card p-2 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button onClick={() => setActiveTab('analytics')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'analytics' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Analytics</button>
            <button onClick={() => setActiveTab('ledger')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'ledger' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Monthly Ledger</button>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/10 transition-all" 
            />
            <span className="text-[13px] font-medium text-slate-500">ถึง</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/10 transition-all" 
            />
            <button onClick={onApplyFilter} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-slate-700 transition-all shadow-md active:scale-95">ค้นหา</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {[
            { label: 'Selected Trips', value: totalStats.trips.toLocaleString(), icon: Truck, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Selected Distance', value: `${totalStats.distance.toFixed(2)} km`, icon: Route, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Selected Emission', value: `${totalStats.emission.toFixed(2)} kgCO₂e`, icon: Leaf, color: '#F59E0B', bg: '#FFF7ED' },
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
            <span className="text-slate-400">Compiling Report Data...</span>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'analytics' ? (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 size={18} className="text-emerald-500" />
                  <span className="text-[15px] font-bold text-slate-800">Visual Activity Breakdown</span>
                </div>
                {activities.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 italic">No activity data found for selected criteria.</div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((item) => (
                      <div key={`${item.tripId}-${item.label}`} className="grid grid-cols-[120px_1fr_100px] items-center gap-4">
                        <span className="text-[11px] font-bold text-slate-500 truncate">{item.tripId || item.label}</span>
                        <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${(item.emissionKgCo2e / maxActivityEmission) * 100}%` }} />
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 text-right">{item.emissionKgCo2e.toLocaleString()} <span className="text-[9px] text-slate-400">kg</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Historical Sustainability Ledger</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold uppercase">Certified Method</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="p-4">Period</th>
                        <th className="p-4">Count</th>
                        <th className="p-4">Distance (km)</th>
                        <th className="p-4">Emission (kgCO₂e)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.monthKey} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                          <td className="p-4 font-bold text-slate-700">{r.monthKey}</td>
                          <td className="p-4 text-slate-500">{r.totalTrips}</td>
                          <td className="p-4 text-slate-500">{r.totalDistanceKm.toLocaleString()}</td>
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
          ESG Reports generated based on activity-level precision.
        </div>
      </div>
    </SidebarLayout>
  );
}
