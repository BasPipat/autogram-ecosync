'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Loader2, Save } from 'lucide-react';

export default function MasterSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fuelEfficiencyKmPerLiterDefault: '3',
    emissionFactorKgCo2PerLiter: '2.68',
    standardReference: 'TGO',
  });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/settings/master', { cache: 'no-store' });
        const data = await res.json();
        if (data?.setting) {
          setForm({
            fuelEfficiencyKmPerLiterDefault: String(data.setting.fuelEfficiencyKmPerLiterDefault),
            emissionFactorKgCo2PerLiter: String(data.setting.emissionFactorKgCo2PerLiter),
            standardReference: data.setting.standardReference || 'TGO',
          });
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/master', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelEfficiencyKmPerLiterDefault: Number(form.fuelEfficiencyKmPerLiterDefault),
          emissionFactorKgCo2PerLiter: Number(form.emissionFactorKgCo2PerLiter),
          standardReference: form.standardReference,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      alert('บันทึก Master Settings สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">Master Settings</h1>
        <p className="text-sm text-slate-500 mt-1">จัดการค่ากลางน้ำมันและ Emission Factor</p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          {loading ? (
            <div className="h-24 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> กำลังโหลดข้อมูล...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Fuel Efficiency (km/L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.fuelEfficiencyKmPerLiterDefault}
                  onChange={(e) => setForm((v) => ({ ...v, fuelEfficiencyKmPerLiterDefault: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Emission Factor (kgCO2/L)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.emissionFactorKgCo2PerLiter}
                  onChange={(e) => setForm((v) => ({ ...v, emissionFactorKgCo2PerLiter: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Standard Reference</label>
                <input
                  value={form.standardReference}
                  onChange={(e) => setForm((v) => ({ ...v, standardReference: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกค่า'}
              </button>
            </>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
