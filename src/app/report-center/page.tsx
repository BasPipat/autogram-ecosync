'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Download, FileText, Loader2, Table } from 'lucide-react';
import { jsPDF } from 'jspdf';

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

function downloadPdf(rows: Row[]) {
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
      <div className="p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Report Center</h1>
            <p className="text-sm text-slate-500">ดาวน์โหลดรายงาน Carbon Activity ได้ทั้ง Excel และ PDF</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadCsv(rows)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <Table size={15} /> Download Excel
            </button>
            <button
              onClick={() => downloadPdf(rows)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              <FileText size={15} /> Download PDF
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-900">Monthly Ledger</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3 text-left">Month</th>
                  <th className="p-3 text-left">Trips</th>
                  <th className="p-3 text-left">Distance</th>
                  <th className="p-3 text-left">Fuel</th>
                  <th className="p-3 text-left">Emission</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400"><Loader2 className="inline w-4 h-4 animate-spin mr-2" /> Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">No monthly data</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.monthKey} className="border-t border-slate-100">
                      <td className="p-3 font-medium">{r.monthKey}</td>
                      <td className="p-3">{r.totalTrips}</td>
                      <td className="p-3">{r.totalDistanceKm}</td>
                      <td className="p-3">{r.totalFuelLitersForecast}</td>
                      <td className="p-3 text-emerald-700">{r.totalEmissionKgCo2e}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500 inline-flex items-center gap-1">
          <Download size={12} /> Export ใช้ข้อมูลล่าสุดจาก Monthly Carbon Ledger ในฐานข้อมูล
        </p>
      </div>
    </SidebarLayout>
  );
}
