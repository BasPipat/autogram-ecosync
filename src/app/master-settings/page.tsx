'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { 
  Loader2, Save, Plus, Trash2, Settings, Fuel, FlaskConical, 
  History, Leaf, MapPin, Users, ExternalLink, ShieldCheck, 
  FileText, Globe, AlertCircle, Truck
} from 'lucide-react';

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
    standardReference: 'TGO (Thailand Greenhouse Gas Management Organization)',
    version: 'TGO-2024-V1',
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
            standardReference: data.setting.standardReference || 'TGO (Thailand Greenhouse Gas Management Organization)',
            version: data.setting.version || 'TGO-2024-V1',
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

  const handleAddVehicleType = () => setVehicleTypes(prev => [...prev, { typeName: '', minKmPerLiter: '', maxKmPerLiter: '' }]);
  const handleUpdateVehicleType = (i: number, key: keyof VehicleTypeSetting, value: string) => setVehicleTypes(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item));
  const handleRemoveVehicleType = (i: number) => setVehicleTypes(prev => prev.filter((_, idx) => idx !== i));

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
            <p className="text-slate-600">กำลังโหลดข้อมูลมาตรฐาน...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto animate-fade-in pb-20">
          
          {/* ── Compliance Hub Header ── */}
          <div className="mb-8 p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.05]">
              <ShieldCheck size={120} className="text-emerald-500" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  Compliance Status: Active
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                  Standard: {form.version}
                </div>
              </div>
              
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Master Configuration Hub</h1>
              <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium leading-relaxed">
                ศูนย์กลางการจัดการค่ามาตรฐานสำหรับการคำนวณก๊าซเรือนกระจก (GHG) 
                อ้างอิงตามมาตรฐาน <span className="text-emerald-600 font-bold">องค์การบริหารจัดการก๊าซเรือนกระจก (TGO)</span> 
                เพื่อให้รายงานของคุณมีความน่าเชื่อถือสูงสุด
              </p>
              
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-50">
                <Link href="/master-settings/location-master" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-[13px] font-bold transition hover:bg-slate-800 shadow-lg shadow-slate-200">
                  <MapPin size={16} /> Location Master
                </Link>
                <Link href="/master-settings/customer-master" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-[13px] font-bold transition hover:bg-slate-50">
                  <Users size={16} /> Customer Master
                </Link>
                <a href="https://www.tgo.or.th" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-50 text-emerald-700 text-[13px] font-bold transition hover:bg-emerald-100 ml-auto border border-emerald-100">
                  <Globe size={16} /> Official TGO Portal <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Settings */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section 1: EF by Vehicle */}
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <Leaf size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800">Emission Factors (Ton-KM)</h2>
                      <p className="text-[12px] font-medium text-slate-400">อ้างอิงตามประเภทรถบรรทุกและน้ำหนักบรรทุก</p>
                    </div>
                  </div>
                  <button onClick={handleAddEF} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[12px] font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">
                    <Plus size={14} /> เพิ่มประเภท
                  </button>
                </div>

                <div className="space-y-4">
                  {efSettings.map((item, index) => (
                    <div key={index} className="group p-5 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-emerald-100 transition-all">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                            <Truck size={10} /> ประเภทรถบรรทุก
                          </label>
                          <input value={item.vehicleType} onChange={e => handleUpdateEF(index, 'vehicleType', e.target.value)}
                            className="w-full bg-white border border-slate-100 px-4 py-2.5 rounded-xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-emerald-500/10" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-emerald-500 uppercase mb-1.5 flex items-center gap-1.5">
                            <ShieldCheck size={10} /> ค่า EF (kgCO₂e)
                          </label>
                          <input type="number" step="0.0001" value={item.efTonKm} onChange={e => handleUpdateEF(index, 'efTonKm', e.target.value)}
                            className="w-full bg-white border border-slate-100 px-4 py-2.5 rounded-xl text-[13px] font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/10" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5">เชื้อเพลิง</label>
                          <input value={item.fuelType} onChange={e => handleUpdateEF(index, 'fuelType', e.target.value)}
                            className="w-full bg-white border border-slate-100 px-4 py-2.5 rounded-xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-emerald-500/10" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                        <div className="flex items-center gap-2">
                          <FileText size={12} className="text-slate-300" />
                          <span className="text-[11px] font-bold text-slate-400">Reference:</span>
                          <input value={item.tgoRef} onChange={e => handleUpdateEF(index, 'tgoRef', e.target.value)}
                            className="bg-transparent border-none p-0 text-[11px] font-black text-slate-500 focus:ring-0 w-40" />
                        </div>
                        <button onClick={() => handleRemoveEF(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Fuel Efficiency */}
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                      <Fuel size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800">Performance Metrics</h2>
                      <p className="text-[12px] font-medium text-slate-400">อัตราการใช้พลังงานเพื่อการวิเคราะห์ทางบัญชี</p>
                    </div>
                  </div>
                  <button onClick={handleAddVehicleType} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-[12px] font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-100">
                    <Plus size={14} /> เพิ่มประเภท
                  </button>
                </div>
                
                <div className="space-y-3">
                  {vehicleTypes.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_auto] gap-4 p-4 rounded-2xl bg-slate-50/30 border border-slate-50">
                      <input value={item.typeName} onChange={e => handleUpdateVehicleType(index, 'typeName', e.target.value)}
                        placeholder="Vehicle Class" className="bg-white border border-slate-100 px-4 py-2.5 rounded-xl text-[13px] font-bold outline-none" />
                      <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-300 uppercase">Min</span>
                        <input type="number" step="0.1" value={item.minKmPerLiter} onChange={e => handleUpdateVehicleType(index, 'minKmPerLiter', e.target.value)}
                          className="w-full text-[13px] font-black border-none focus:ring-0 p-0" />
                      </div>
                      <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-300 uppercase">Max</span>
                        <input type="number" step="0.1" value={item.maxKmPerLiter} onChange={e => handleUpdateVehicleType(index, 'maxKmPerLiter', e.target.value)}
                          className="w-full text-[13px] font-black border-none focus:ring-0 p-0" />
                      </div>
                      <button onClick={() => handleRemoveVehicleType(index)} className="p-2 text-slate-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Reference & History */}
            <div className="space-y-6">
              
              {/* Compliance Info */}
              <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute bottom-0 right-0 p-4 opacity-10">
                  <Globe size={100} />
                </div>
                <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  Audit & Compliance
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Official Reference</label>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-[13px] font-bold leading-relaxed">
                      {form.standardReference}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Standard Version</label>
                    <input value={form.version} onChange={e => setForm(v => ({ ...v, version: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-[14px] font-black outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  </div>

                  <div className="pt-4 space-y-3">
                    <p className="text-[11px] font-medium text-slate-400 italic flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      ข้อมูล EF อ้างอิงตามค่าความร้อนสุทธิ (Net Calorific Value) ของเชื้อเพลิงในไทย
                    </p>
                    <button className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-black text-[12px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all">
                      Download PDF Guide
                    </button>
                  </div>
                </div>
              </div>

              {/* Version History */}
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <History size={20} className="text-purple-500" />
                  Audit Trail
                </h3>
                <div className="space-y-4">
                  {history.map((v, i) => (
                    <div key={i} className={`p-4 rounded-2xl border ${v.isActive ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-50 bg-slate-50/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[12px] font-black ${v.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>{v.version}</span>
                        {v.isActive && <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-500 text-white uppercase">Active</span>}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>{v.publishedBy || 'System Admin'}</span>
                        <span>{new Date(v.effectiveFrom).toLocaleDateString('th-TH')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button onClick={onSave} disabled={saving}
                className="w-full py-5 rounded-[24px] bg-emerald-500 text-white font-black text-[15px] shadow-2xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {saving ? 'กำลังอัปเดตข้อมูล...' : 'Update Standards'}
              </button>

            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
