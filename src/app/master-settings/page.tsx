'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Loader2, Save, Plus, Trash2, Settings, Fuel, FlaskConical, History, Leaf, MapPin } from 'lucide-react';

type VehicleTypeSetting = { typeName: string; minKmPerLiter: string; maxKmPerLiter: string };
type EFSetting = { vehicleType: string; efTonKm: string; fuelType: string; tgoRef: string };
type VersionEntry = { version: string; publishedBy?: string; effectiveFrom: string; isActive: boolean };

export default function MasterSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeSetting[]>([
    { typeName: 'Trailer 22-Wheel', minKmPerLiter: '2.5', maxKmPerLiter: '3.5' },
  ]);
  const [efSettings, setEfSettings] = useState<EFSetting[]>([
    { vehicleType: 'Trailer 22-Wheel', efTonKm: '0.0650', fuelType: 'Diesel B7', tgoRef: 'TGO Standard' },
    { vehicleType: '10-Wheel Truck',   efTonKm: '0.1120', fuelType: 'Diesel B7', tgoRef: 'TGO Standard' },
    { vehicleType: '6-Wheel Truck',    efTonKm: '0.1800', fuelType: 'Diesel B7', tgoRef: 'TGO Standard' },
    { vehicleType: 'Pickup',           efTonKm: '0.2400', fuelType: 'Diesel B7', tgoRef: 'TGO Standard' },
  ]);
  const [form, setForm] = useState({
    emissionFactorKgCo2PerLiter: '2.68',
    standardReference: 'TGO',
    version: 'TGO-2024',
  });
  const [history, setHistory] = useState<VersionEntry[]>([]);

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
            version: data.setting.version || 'TGO-2024',
          });
          if (Array.isArray(data.setting.fuelEfficiencyByVehicleType) && data.setting.fuelEfficiencyByVehicleType.length) {
            setVehicleTypes(data.setting.fuelEfficiencyByVehicleType.map((item: any) => ({
              typeName: item.typeName || '', minKmPerLiter: String(item.minKmPerLiter || ''), maxKmPerLiter: String(item.maxKmPerLiter || ''),
            })));
          }
          if (Array.isArray(data.setting.emissionFactorsByVehicleType) && data.setting.emissionFactorsByVehicleType.length) {
            setEfSettings(data.setting.emissionFactorsByVehicleType.map((item: any) => ({
              vehicleType: item.vehicleType || '', efTonKm: String(item.efTonKm || ''), fuelType: item.fuelType || 'Diesel B7', tgoRef: item.tgoRef || 'TGO Standard',
            })));
          }
        }
        if (Array.isArray(data?.history)) setHistory(data.history);
      } catch (error) { console.error('Load settings error', error); }
      finally { setLoading(false); }
    };
    run();
  }, []);

  // ── Vehicle Type handlers ──
  const handleAddVehicleType = () => setVehicleTypes(prev => [...prev, { typeName: '', minKmPerLiter: '', maxKmPerLiter: '' }]);
  const handleUpdateVehicleType = (i: number, key: keyof VehicleTypeSetting, value: string) => setVehicleTypes(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item));
  const handleRemoveVehicleType = (i: number) => setVehicleTypes(prev => prev.filter((_, idx) => idx !== i));

  // ── EF handlers ──
  const handleAddEF = () => setEfSettings(prev => [...prev, { vehicleType: '', efTonKm: '', fuelType: 'Diesel B7', tgoRef: 'TGO Standard' }]);
  const handleUpdateEF = (i: number, key: keyof EFSetting, value: string) => setEfSettings(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item));
  const handleRemoveEF = (i: number) => setEfSettings(prev => prev.filter((_, idx) => idx !== i));

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/master', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelEfficiencyByVehicleType: vehicleTypes.map(item => ({
            typeName: item.typeName, minKmPerLiter: Number(item.minKmPerLiter), maxKmPerLiter: Number(item.maxKmPerLiter),
          })),
          emissionFactorsByVehicleType: efSettings.map(item => ({
            vehicleType: item.vehicleType, efTonKm: Number(item.efTonKm), fuelType: item.fuelType, tgoRef: item.tgoRef,
          })),
          emissionFactorKgCo2PerLiter: Number(form.emissionFactorKgCo2PerLiter),
          standardReference: form.standardReference,
          version: form.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'บันทึกไม่สำเร็จ'); return; }
      alert('บันทึก Master Settings สำเร็จ (สร้าง Version ใหม่แล้ว)');
      // Refresh history
      const refreshRes = await fetch('/api/settings/master', { cache: 'no-store' });
      const refreshData = await refreshRes.json();
      if (Array.isArray(refreshData?.history)) setHistory(refreshData.history);
    } catch (error) { console.error('Save error', error); alert('เกิดข้อผิดพลาด'); }
    finally { setSaving(false); }
  };

  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-md)',
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
          <div className="max-w-5xl mx-auto py-24 text-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-slate-500" />
            <p className="text-slate-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl animate-fade-in">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
                <Settings size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Master Settings</h1>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Emission Factor, Fuel Efficiency & TGO Compliance Configuration
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <Link href="/master-settings/location-master" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                <MapPin size={16} /> Location Master
              </Link>
            </div>
          </div>

          <div className="space-y-6">

              {/* ════════════════════════════════════════════ */}
              {/* Section 1: EF per Ton-KM (TGO Standard) — PRIMARY */}
              {/* ════════════════════════════════════════════ */}
              <div className="card p-6" style={{ border: '2px solid var(--accent-light)' }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                      <Leaf size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        Emission Factor by Vehicle Type (kgCO₂e / Ton-KM)
                      </h2>
                      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        ค่าสัมประสิทธิ์ตาม TGO Standard — ใช้สำหรับคำนวณคาร์บอนรายเที่ยว
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={handleAddEF}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    <Plus size={15} /> เพิ่มประเภท
                  </button>
                </div>

                <div className="space-y-3">
                  {efSettings.map((item, index) => (
                    <div key={index} className="grid gap-3 p-4 rounded-xl md:grid-cols-[1.5fr_0.8fr_0.8fr_1fr_auto]"
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)' }}>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>ประเภทรถ</label>
                        <input value={item.vehicleType} onChange={e => handleUpdateEF(index, 'vehicleType', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>EF (kgCO₂e/ton-km)</label>
                        <input type="number" step="0.0001" value={item.efTonKm} onChange={e => handleUpdateEF(index, 'efTonKm', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Fuel Type</label>
                        <input value={item.fuelType} onChange={e => handleUpdateEF(index, 'fuelType', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>TGO Reference</label>
                        <input value={item.tgoRef} onChange={e => handleUpdateEF(index, 'tgoRef', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                      </div>
                      <button type="button" onClick={() => handleRemoveEF(index)}
                        className="mt-6 w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                        style={{ background: '#FEF2F2', color: '#EF4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ════════════════════════════════════════════ */}
              {/* Section 2: Fuel Efficiency (Legacy) */}
              {/* ════════════════════════════════════════════ */}
              <div className="card p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                      <Fuel size={16} style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Fuel Efficiency by Vehicle Type</h2>
                      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>อัตราสิ้นเปลืองน้ำมัน (สำหรับ Fuel Forecast)</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleAddVehicleType}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    <Plus size={15} /> เพิ่มประเภทรถ
                  </button>
                </div>
                <div className="space-y-3">
                  {vehicleTypes.map((item, index) => (
                    <div key={index} className="grid gap-3 p-4 rounded-xl md:grid-cols-[1.7fr_1fr_1fr_auto]"
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)' }}>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>ประเภทรถ</label>
                        <input value={item.typeName} onChange={e => handleUpdateVehicleType(index, 'typeName', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Min km/L</label>
                        <input type="number" step="0.01" value={item.minKmPerLiter} onChange={e => handleUpdateVehicleType(index, 'minKmPerLiter', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Max km/L</label>
                        <input type="number" step="0.01" value={item.maxKmPerLiter} onChange={e => handleUpdateVehicleType(index, 'maxKmPerLiter', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                      </div>
                      <button type="button" onClick={() => handleRemoveVehicleType(index)}
                        className="mt-6 w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                        style={{ background: '#FEF2F2', color: '#EF4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ════════════════════════════════════════════ */}
              {/* Section 3: Global EF + Version */}
              {/* ════════════════════════════════════════════ */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F0FDF4' }}>
                    <FlaskConical size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Global Settings & Version</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>EF (kgCO₂/Litre) — Legacy</label>
                    <input type="number" step="0.0001" value={form.emissionFactorKgCo2PerLiter}
                      onChange={e => setForm(v => ({ ...v, emissionFactorKgCo2PerLiter: e.target.value }))}
                      className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Standard Reference</label>
                    <input value={form.standardReference} onChange={e => setForm(v => ({ ...v, standardReference: e.target.value }))}
                      className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Version</label>
                    <input value={form.version} onChange={e => setForm(v => ({ ...v, version: e.target.value }))}
                      placeholder="e.g. TGO-2024"
                      className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* ════════════════════════════════════════════ */}
              {/* Section 4: Version History */}
              {/* ════════════════════════════════════════════ */}
              {history.length > 0 && (
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F3E8FF' }}>
                      <History size={16} style={{ color: '#7C3AED' }} />
                    </div>
                    <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Version History</h2>
                  </div>
                  <div className="space-y-2">
                    {history.map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl text-[13px]"
                        style={{ background: v.isActive ? '#ECFDF5' : 'var(--bg-base)', border: `1px solid ${v.isActive ? 'var(--accent-light)' : 'var(--border-light)'}` }}>
                        <div className="flex items-center gap-3">
                          <span className="font-bold" style={{ color: v.isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                            {v.version}
                          </span>
                          {v.isActive && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: 'var(--accent)', color: '#fff' }}>Active</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                          <span>{v.publishedBy || '—'}</span>
                          <span>{new Date(v.effectiveFrom).toLocaleString('th-TH')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save */}
              <div className="flex justify-end">
                <button onClick={onSave} disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                  <Save size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึก (สร้าง Version ใหม่)'}
                </button>
              </div>
            </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
