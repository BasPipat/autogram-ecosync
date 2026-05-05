'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Loader2, Save, Plus, Trash2, Settings, Fuel, FlaskConical } from 'lucide-react';

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

  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-4xl animate-fade-in">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}
              >
                <Settings size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Master Settings</h1>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  จัดการค่ากลางน้ำมันและ Emission Factor สำหรับการคำนวณ Fuel Forecast
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div
              className="card flex items-center justify-center py-16"
            >
              <Loader2 className="w-5 h-5 animate-spin mr-2" style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-tertiary)' }}>กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Vehicle Types Section */}
              <div className="card p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: '#EFF6FF' }}
                    >
                      <Fuel size={16} style={{ color: '#3B82F6' }} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        Fuel Efficiency by Vehicle Type
                      </h2>
                      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        ตั้งค่าช่วงอัตราสิ้นเปลืองน้ำมันแยกตามประเภทตัวถัง
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVehicleType}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                    style={{
                      background: 'var(--accent)',
                      color: '#fff',
                    }}
                  >
                    <Plus size={15} /> เพิ่มประเภทรถ
                  </button>
                </div>

                <div className="space-y-3">
                  {vehicleTypes.map((item, index) => (
                    <div
                      key={index}
                      className="grid gap-3 p-4 rounded-xl md:grid-cols-[1.7fr_1fr_1fr_auto]"
                      style={{
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                          ประเภทรถ
                        </label>
                        <input
                          value={item.typeName}
                          onChange={(e) => handleUpdateVehicleType(index, 'typeName', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                          Min km/L
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.minKmPerLiter}
                          onChange={(e) => handleUpdateVehicleType(index, 'minKmPerLiter', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                          Max km/L
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.maxKmPerLiter}
                          onChange={(e) => handleUpdateVehicleType(index, 'maxKmPerLiter', e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                          style={inputStyle}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVehicleType(index)}
                        className="mt-6 w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                        style={{ background: '#FEF2F2', color: '#EF4444' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emission Factor Section */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#F0FDF4' }}
                  >
                    <FlaskConical size={16} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                    Emission Factor
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Emission Factor (kgCO2/L)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.emissionFactorKgCo2PerLiter}
                      onChange={(e) => setForm((v) => ({ ...v, emissionFactorKgCo2PerLiter: e.target.value }))}
                      className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Standard Reference
                    </label>
                    <input
                      value={form.standardReference}
                      onChange={(e) => setForm((v) => ({ ...v, standardReference: e.target.value }))}
                      className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60"
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                  }}
                >
                  <Save size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึกค่า'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
