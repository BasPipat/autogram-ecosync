'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Download, FileText, Loader2, Table, FileBarChart, ShieldCheck, Leaf } from 'lucide-react';

type Row = {
  monthKey: string;
  totalTrips: number;
  totalDistanceKm: number;
  totalFuelLitersForecast: number;
  totalEmissionKgCo2e: number;
  totalTonKm?: number;
  totalWeightTon?: number;
};

// ── Executive PDF Export ──
async function downloadPdf(rows: Row[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  // ── Colors & Constants ──
  const colors = {
    emerald: [16, 185, 129] as [number, number, number],
    slate: [15, 23, 42] as [number, number, number],
    blue: [59, 130, 246] as [number, number, number],
    orange: [245, 158, 11] as [number, number, number],
    bg: [248, 250, 252] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    lightGray: [241, 245, 249] as [number, number, number],
  };

  // ── Header Section ──
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
  
  // ── Summary Cards ──
  const totalTrips = rows.reduce((s, r) => s + r.totalTrips, 0);
  const totalDist = rows.reduce((s, r) => s + r.totalDistanceKm, 0);
  const totalEmission = rows.reduce((s, r) => s + r.totalEmissionKgCo2e, 0);
  
  const cardWidth = 60;
  const cardHeight = 25;
  const startX = 14;
  const startY = 55;

  const drawCard = (x: number, y: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFillColor(...colors.lightGray);
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(x, y + cardHeight, x + cardWidth, y + cardHeight);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x + 5, y + 8);
    
    doc.setFontSize(14);
    doc.setTextColor(...colors.slate);
    doc.text(value, x + 5, y + 18);
  };

  drawCard(startX, startY, 'Total Trips', totalTrips.toLocaleString(), colors.blue);
  drawCard(startX + 65, startY, 'Total Distance', `${totalDist.toLocaleString()} km`, colors.emerald);
  drawCard(startX + 130, startY, 'Carbon Emission', `${totalEmission.toFixed(2)} kgCO2e`, colors.orange);

  // ── Bar Chart (Carbon by Month) ──
  let y = 100;
  doc.setFontSize(14);
  doc.setTextColor(...colors.slate);
  doc.text('Carbon Emission Trend (kgCO2e)', 14, y);
  
  const chartX = 20;
  const chartY = 150;
  const chartWidth = 170;
  const chartHeight = 40;
  
  // Draw Axes
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  doc.line(chartX, chartY, chartX + chartWidth, chartY); // X-axis
  
  const maxVal = Math.max(...rows.map(r => r.totalEmissionKgCo2e), 10);
  const barSpacing = chartWidth / Math.max(rows.length, 1);
  const barWidth = barSpacing * 0.6;

  rows.forEach((row, i) => {
    const bHeight = (row.totalEmissionKgCo2e / maxVal) * chartHeight;
    const bx = chartX + (i * barSpacing) + (barSpacing - barWidth) / 2;
    const by = chartY - bHeight;
    
    // Draw Bar
    doc.setFillColor(...colors.emerald);
    doc.rect(bx, by, barWidth, bHeight, 'F');
    
    // Label
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(row.monthKey, bx + (barWidth / 2), chartY + 5, { align: 'center' });
    
    // Value on top of bar
    doc.setFontSize(6);
    doc.text(row.totalEmissionKgCo2e.toFixed(0), bx + (barWidth / 2), by - 2, { align: 'center' });
  });

  // ── Detailed Table ──
  y = 170;
  doc.setFontSize(14);
  doc.setTextColor(...colors.slate);
  doc.text('Monthly Sustainability Breakdown', 14, y);
  
  y += 8;
  // Table Header
  doc.setFillColor(...colors.lightGray);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...colors.slate);
  doc.text('Month', 18, y + 5);
  doc.text('Trips', 60, y + 5);
  doc.text('Distance (km)', 90, y + 5);
  doc.text('Ton-KM', 130, y + 5);
  doc.text('Emission (kgCO2e)', 160, y + 5);
  
  y += 8;
  doc.setTextColor(...colors.slate);
  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, y, 182, 7, 'F');
    }
    doc.setFontSize(8);
    doc.text(row.monthKey, 18, y + 5);
    doc.text(String(row.totalTrips), 60, y + 5);
    doc.text(row.totalDistanceKm.toLocaleString(), 90, y + 5);
    doc.text(String(row.totalTonKm || 0), 130, y + 5);
    doc.text(row.totalEmissionKgCo2e.toFixed(2), 160, y + 5);
    y += 7;
    
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  // ── Compliance Footer ──
  const footerY = 285;
  doc.setFillColor(...colors.lightGray);
  doc.rect(14, footerY - 15, 182, 12, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...colors.emerald);
  doc.text('Calculated using TGO Standard methodology - Activity-based Approach', 18, footerY - 8);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('© 2026 Autogram Eco-Sync | Sustainability Intelligence Platform', 14, footerY);
  doc.text(`Page 1 of 1`, 180, footerY);

  doc.save(`eco-sync-executive-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Compliance Excel Export ──
async function downloadExcel(rows: Row[]) {
  const XLSX = await import('xlsx');

  // Sheet 1: Monthly Summary
  const summaryData = rows.map(r => ({
    'Month': r.monthKey,
    'Trips': r.totalTrips,
    'Distance (km)': r.totalDistanceKm,
    'Weight (Ton)': r.totalWeightTon || 0,
    'Ton-KM': r.totalTonKm || 0,
    'Fuel Forecast (L)': r.totalFuelLitersForecast,
    'Emission (kgCO2e)': r.totalEmissionKgCo2e,
    'Carbon Intensity (kgCO2e/ton-km)': r.totalTonKm && r.totalTonKm > 0
      ? Math.round((r.totalEmissionKgCo2e / r.totalTonKm) * 10000) / 10000 : 0,
  }));

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(summaryData);

  // Set column widths
  ws1['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 16 }, { wch: 18 }, { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Monthly Summary');

  // Sheet 2: Compliance Notes
  const notesData = [
    { 'Item': 'Report Type', 'Value': 'TGO Compliance Audit Ledger' },
    { 'Item': 'Standard', 'Value': 'TGO - Activity-based Approach' },
    { 'Item': 'Formula', 'Value': 'Emission = Ton-KM × Emission Factor (kgCO2e/ton-km)' },
    { 'Item': 'Ton-KM Formula', 'Value': 'Ton-KM = Cargo Weight (Ton) × Actual Distance (km) from GPS' },
    { 'Item': 'Generated At', 'Value': new Date().toLocaleString('th-TH') },
    { 'Item': 'Platform', 'Value': 'Autogram Eco-Sync v2.0' },
    { 'Item': 'Note', 'Value': 'Distance is derived from actual GPS route data, not map estimates.' },
  ];
  const ws2 = XLSX.utils.json_to_sheet(notesData);
  ws2['!cols'] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Compliance Notes');

  XLSX.writeFile(wb, `eco-sync-compliance-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function ReportCenterPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/report-center/monthly', { cache: 'no-store' });
        const data = await res.json();
        setRows(data.rows || []);
      } finally { setLoading(false); }
    };
    run();
  }, []);

  // Totals
  const totalTrips = rows.reduce((s, r) => s + r.totalTrips, 0);
  const totalEmission = rows.reduce((s, r) => s + r.totalEmissionKgCo2e, 0);
  const totalDistance = rows.reduce((s, r) => s + r.totalDistanceKm, 0);

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
              <FileBarChart size={20} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Report Center</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                TGO-Compliant Sustainability & Compliance Reports
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadExcel(rows)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <Table size={14} /> Compliance Excel
            </button>
            <button onClick={() => downloadPdf(rows)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <FileText size={14} /> Executive PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6 animate-fade-in">
          {[
            { label: 'Total Trips', value: totalTrips.toLocaleString(), icon: ShieldCheck, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Total Distance', value: `${totalDistance.toLocaleString()} km`, icon: Leaf, color: 'var(--accent)', bg: '#ECFDF5' },
            { label: 'Total Emission', value: `${totalEmission.toFixed(2)} kgCO₂e`, icon: FileBarChart, color: '#F59E0B', bg: '#FFF7ED' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{card.label}</p>
                  <p className="text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="card overflow-hidden animate-fade-in">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <span className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>Monthly Ledger</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase"
              style={{ background: '#ECFDF5', color: 'var(--accent)' }}>
              TGO Compliant
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'var(--bg-base)' }}>
                  {['Month', 'Trips', 'Distance (km)', 'Fuel Forecast (L)', 'Emission (kgCO₂e)'].map(h => (
                    <th key={h} className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center">
                    <Loader2 className="inline w-4 h-4 animate-spin mr-2" style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
                  </td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>ยังไม่มีข้อมูลรายงาน</td></tr>
                ) : rows.map(r => (
                  <tr key={r.monthKey} className="transition-colors" style={{ borderTop: '1px solid var(--border-light)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border-light)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td className="p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{r.monthKey}</td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.totalTrips}</td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.totalDistanceKm.toLocaleString()}</td>
                    <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.totalFuelLitersForecast.toLocaleString()}</td>
                    <td className="p-3 font-semibold" style={{ color: 'var(--accent)' }}>{r.totalEmissionKgCo2e.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <Download size={11} /> Reports follow TGO Activity-based Approach methodology with GPS-verified distance data
        </p>
      </div>
    </SidebarLayout>
  );
}
