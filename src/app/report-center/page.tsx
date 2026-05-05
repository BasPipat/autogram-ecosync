'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Download, FileText, Loader2, Table, FileBarChart } from 'lucide-react';

type Row = {
  monthKey: string;
  totalTrips: number;
  totalDistanceKm: number;
  totalFuelLitersForecast: number;
  totalEmissionKgCo2e: number;
};

function downloadCsv(rows: Row[]) {
  const header = ['Month', 'Trips', 'DistanceKm', 'FuelForecastLiters', 'EmissionKgCO2e'];
  const body = rows.map((r) => [r.monthKey, r.totalTrips, r.totalDistanceKm, r.totalFuelLitersForecast, r.totalEmissionKgCo2e].join(','));
  const csv = [header.join(','), ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `carbon-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdf(rows: Row[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Carbon Activity Monthly Report', 14, 18);
  doc.setFontSize(10);
  let y = 28;
  rows.slice(0, 30).forEach((row) => {
    doc.text(
      `${row.monthKey} | trips ${row.totalTrips} | dist ${row.totalDistanceKm} km | fuel ${row.totalFuelLitersForecast} L | co2 ${row.totalEmissionKgCo2e}`,
      14,
      y
    );
    y += 6;
    if (y > 285) {
      doc.addPage();
      y = 18;
    }
  });
  doc.save(`carbon-report-${new Date().toISOString().slice(0, 10)}.pdf`);
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
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}
            >
              <FileBarChart size={20} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Report Center</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                ดาวน์โหลดรายงาน Carbon Activity ได้ทั้ง Excel และ PDF
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadCsv(rows)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <Table size={14} /> Download Excel
            </button>
            <button
              onClick={() => downloadPdf(rows)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: 'var(--accent)',
                color: '#fff',
              }}
            >
              <FileText size={14} /> Download PDF
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden animate-fade-in">
          <div className="px-6 py-4 font-bold text-[14px]" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)' }}>
            Monthly Ledger
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'var(--bg-base)' }}>
                  <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Month</th>
                  <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Trips</th>
                  <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Distance</th>
                  <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Fuel</th>
                  <th className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Emission</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="inline w-4 h-4 animate-spin mr-2" style={{ color: 'var(--accent)' }} />
                      <span style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
                      No monthly data
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.monthKey}
                      className="transition-colors"
                      style={{ borderTop: '1px solid var(--border-light)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--border-light)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{r.monthKey}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.totalTrips}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.totalDistanceKm}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.totalFuelLitersForecast}</td>
                      <td className="p-3 font-semibold" style={{ color: 'var(--accent)' }}>{r.totalEmissionKgCo2e}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <Download size={11} /> Export ใช้ข้อมูลล่าสุดจาก Monthly Carbon Ledger ในฐานข้อมูล
        </p>
      </div>
    </SidebarLayout>
  );
}
