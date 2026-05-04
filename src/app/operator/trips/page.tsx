'use client';

import { FormEvent, useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Loader2, PlusCircle, Truck } from 'lucide-react';

type TripItem = {
  _id: string;
  tripId: string;
  origin: string;
  destination: string;
  weight?: number;
  status?: string;
};

export default function OperatorTripsPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tripId: '',
    origin: '',
    destination: '',
    weight: '',
  });

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/trips', { cache: 'no-store' });
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const submitTrip = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: form.tripId || undefined,
          origin: form.origin,
          destination: form.destination,
          weight: Number(form.weight || 0),
          status: 'Pending',
          gpsSession: {
            source: 'line_oa',
            status: 'inactive',
            isTracking: false,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'สร้างงานไม่สำเร็จ');
        return;
      }

      setForm({ tripId: '', origin: '', destination: '', weight: '' });
      fetchTrips();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="text-cyan-600" /> Trip Management (Operator)
        </h1>
        <p className="text-sm text-slate-500 mb-6">เพิ่มงานขนส่งใหม่และลงน้ำหนักสินค้า</p>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-7">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PlusCircle size={18} className="text-emerald-600" /> เพิ่มงานใหม่
          </h2>
          <form onSubmit={submitTrip} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={form.tripId}
              onChange={(e) => setForm((v) => ({ ...v, tripId: e.target.value }))}
              placeholder="Trip ID (optional)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              value={form.origin}
              onChange={(e) => setForm((v) => ({ ...v, origin: e.target.value }))}
              placeholder="ต้นทาง"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              value={form.destination}
              onChange={(e) => setForm((v) => ({ ...v, destination: e.target.value }))}
              placeholder="ปลายทาง"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              required
              value={form.weight}
              onChange={(e) => setForm((v) => ({ ...v, weight: e.target.value }))}
              placeholder="น้ำหนักสินค้า (ตัน)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              disabled={saving}
              className="md:col-span-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกงานขนส่ง'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 font-semibold text-slate-800">รายการงานขนส่ง</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left p-3">Trip ID</th>
                  <th className="text-left p-3">ต้นทาง</th>
                  <th className="text-left p-3">ปลายทาง</th>
                  <th className="text-left p-3">น้ำหนัก (ตัน)</th>
                  <th className="text-left p-3">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : trips.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">ยังไม่มีงานขนส่ง</td></tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip._id} className="border-t border-slate-100">
                      <td className="p-3 font-medium text-cyan-700">{trip.tripId}</td>
                      <td className="p-3">{trip.origin}</td>
                      <td className="p-3">{trip.destination}</td>
                      <td className="p-3">{trip.weight ?? 0}</td>
                      <td className="p-3">{trip.status || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
