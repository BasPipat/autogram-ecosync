'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';

type VehicleTypeSetting = {
  typeName: string;
  minKmPerLiter: string;
  maxKmPerLiter: string;
};

export default function MasterSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeSetting[]>([
    { typeName: 'เทรลเลอร์ 22 ล้อ', minKmPerLiter: '2.5', maxKmPerLiter: '3.5' },
  ]);
  const [form, setForm] = useState({
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
            emissionFactorKgCo2PerLiter: String(data.setting.emissionFactorKgCo2PerLiter || '2.68'),
            standardReference: data.setting.standardReference || 'TGO',
          });
          if (Array.isArray(data.setting.fuelEfficiencyByVehicleType) && data.setting.fuelEfficiencyByVehicleType.length) {
            setVehicleTypes(
              data.setting.fuelEfficiencyByVehicleType.map((item: any) => ({
                typeName: item.typeName || '',
                minKmPerLiter: String(item.minKmPerLiter || ''),
                maxKmPerLiter: String(item.maxKmPerLiter || ''),
              }))
            );
          }
        }
      } catch (error) {
        console.error('Load settings error', error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleAddVehicleType = () => {
    setVehicleTypes((prev) => [...prev, { typeName: '', minKmPerLiter: '', maxKmPerLiter: '' }]);
  };

  const handleUpdateVehicleType = (index: number, key: keyof VehicleTypeSetting, value: string) => {
    setVehicleTypes((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
  };

  const handleRemoveVehicleType = (index: number) => {
    setVehicleTypes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/master', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelEfficiencyByVehicleType: vehicleTypes.map((item) => ({
            typeName: item.typeName,
            minKmPerLiter: Number(item.minKmPerLiter),
            maxKmPerLiter: Number(item.maxKmPerLiter),
          })),
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
    } catch (error) {
      console.error('Save settings error', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-8 max-w-5xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-[#081724]/90 p-6 shadow-[0_30px_80px_-40px_rgba(16,185,129,0.3)] backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-white">Master Settings</h1>
          <p className="mt-2 text-slate-300">จัดการค่ากลางน้ำมันและ Emission Factor สำหรับการคำนวณ Fuel Forecast</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_-30px_rgba(16,185,129,0.25)] backdrop-blur-xl">
          {loading ? (
            <div className="h-24 flex items-center justify-center text-slate-300">
              <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-300" /> กำลังโหลดข้อมูล...
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Fuel Efficiency by Vehicle Type</h2>
                  <p className="mt-1 text-sm text-slate-400">ตั้งค่าช่วงอัตราสิ้นเปลืองน้ำมันแยกตามประเภทตัวถัง</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVehicleType}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  <Plus size={16} /> เพิ่มประเภทรถ
                </button>
              </div>

              <div className="space-y-4">
                {vehicleTypes.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-4 rounded-3xl border border-white/10 bg-[#0b1f34]/90 p-4 text-slate-100 md:grid-cols-[1.7fr_1fr_1fr_auto]"
                  >
                    <div>
                      <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">ประเภทรถ</label>
                      <input
                        value={item.typeName}
                        onChange={(e) => handleUpdateVehicleType(index, 'typeName', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0a192f] px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">Min km/L</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.minKmPerLiter}
                        onChange={(e) => handleUpdateVehicleType(index, 'minKmPerLiter', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0a192f] px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.2em] text-slate-500">Max km/L</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.maxKmPerLiter}
                        onChange={(e) => handleUpdateVehicleType(index, 'maxKmPerLiter', e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0a192f] px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVehicleType(index)}
                      className="mt-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Emission Factor (kgCO2/L)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.emissionFactorKgCo2PerLiter}
                    onChange={(e) => setForm((v) => ({ ...v, emissionFactorKgCo2PerLiter: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#0a192f] px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Standard Reference</label>
                  <input
                    value={form.standardReference}
                    onChange={(e) => setForm((v) => ({ ...v, standardReference: e.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-[#0a192f] px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  <Save size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกค่า'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
