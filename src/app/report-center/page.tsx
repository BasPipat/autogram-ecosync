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

  // Header
  doc.setFontSize(20);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text('Autogram Eco-Sync', 14, 18);
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Sustainability Summary', 14, 28);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 35);

  // Summary stats
  const totalTrips = rows.reduce((s, r) => s + r.totalTrips, 0);
  const totalDist = rows.reduce((s, r) => s + r.totalDistanceKm, 0);
  const totalEmission = rows.reduce((s, r) => s + r.totalEmissionKgCo2e, 0);
  const totalTonKm = rows.reduce((s, r) => s + (r.totalTonKm || 0), 0);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  let y = 48;
  doc.text(`Total Trips: ${totalTrips.toLocaleString()}`, 14, y); y += 7;
  doc.text(`Total Distance: ${totalDist.toLocaleString()} km`, 14, y); y += 7;
  doc.text(`Total Ton-KM: ${totalTonKm.toLocaleString()}`, 14, y); y += 7;
  doc.text(`Total Emission: ${totalEmission.toFixed(2)} kgCO2e`, 14, y); y += 7;
  if (totalTonKm > 0) {
    const intensity = totalEmission / totalTonKm;
    doc.text(`Carbon Intensity: ${intensity.toFixed(4)} kgCO2e/ton-km`, 14, y); y += 7;
  }

  // Compliance badge
  y += 5;
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(14, y, 182, 12, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text('Calculated based on TGO Emission Factor for Freight Transport (Activity-based Approach)', 18, y + 8);
  y += 20;

  // Monthly table
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Monthly Breakdown', 14, y); y += 8;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Month', 14, y);
  doc.text('Trips', 50, y);
  doc.text('Distance (km)', 70, y);
  doc.text('Ton-KM', 110, y);
  doc.text('Emission (kgCO2e)', 140, y);
  y += 5;

  doc.setDrawColor(228, 235, 241);
  doc.line(14, y, 196, y);
  y += 4;

  doc.setTextColor(15, 23, 42);
  rows.forEach(row => {
    if (y > 280) { doc.addPage(); y = 18; }
    doc.text(row.monthKey, 14, y);
    doc.text(String(row.totalTrips), 50, y);
    doc.text(row.totalDistanceKm.toLocaleString(), 70, y);
    doc.text(String(row.totalTonKm || 0), 110, y);
    doc.text(row.totalEmissionKgCo2e.toFixed(2), 140, y);
    y += 6;
  });

  // Footer
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('© 2026 Autogram Eco-Sync — Carbon Intelligence Platform', 14, y);
  doc.text('This report is generated in compliance with TGO Standard for ESG Reporting.', 14, y + 5);

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
