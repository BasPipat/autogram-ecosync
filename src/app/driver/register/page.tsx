'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Phone, Truck, Fuel, ShieldCheck, 
  UploadCloud, CheckCircle, Loader2, MapPin, 
  AlertCircle, ChevronRight, Camera
} from 'lucide-react';
import liff from '@line/liff';

export default function DriverRegistrationPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [liffLoading, setLiffLoading] = useState(true);

  const [form, setForm] = useState({
    displayName: '',
    phone: '',
    vehicleType: 'Trailer 22W',
    fuelType: 'Diesel B7',
    engineSize: '12,000cc',
    licensePlate: '',
    idCardUrl: '',
    licenseUrl: '',
  });

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
        if (!liffId) {
          setError('LIFF ID is not configured');
          setLiffLoading(false);
          return;
        }

        await liff.init({ liffId });
        
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        console.log('LIFF Profile fetched:', profile);
        setLineUserId(profile.userId);
        
        // Also check if user ID is in URL (for testing)
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('lineUserId');
        if (urlId) setLineUserId(urlId);

      } catch (err: any) {
        console.error('LIFF Init Error:', err);
        setError('Failed to initialize LINE connection. Please use LINE app.');
      } finally {
        setLiffLoading(false);
      }
    };

    initLiff();
  }, []);

  // Request GPS Permission early as per requirement
  const requestGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setGpsStatus('granted'),
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate upload - in a real app, you'd upload to S3/Cloudinary here
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, [field]: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    console.log('Submitting registration. lineUserId state:', lineUserId);
    
    if (!lineUserId || lineUserId === 'undefined' || lineUserId === 'null') {
      setError('ไม่พบ LINE User ID กรุณาเข้าใช้งานผ่าน LINE OA เท่านั้น (Frontend Check)');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // API call to register driver - passing lineUserId in query string as expected by API
      const res = await fetch(`/api/driver/register?lineUserId=${lineUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          gpsStatus
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('System error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[32px] p-10 shadow-xl max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">ลงทะเบียนเรียบร้อย!</h1>
          <p className="text-slate-500 font-medium mb-8">
            ข้อมูลของคุณถูกส่งเข้าระบบแล้ว เจ้าหน้าที่จะตรวจสอบเอกสารและแจ้งผลการอนุมัติผ่าน LINE โดยเร็วที่สุด
          </p>
          <button 
            onClick={() => {
              if (typeof window !== 'undefined' && (window as any).liff) {
                (window as any).liff.closeWindow();
              } else {
                window.close();
              }
            }}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg shadow-slate-200"
          >
            ปิดหน้านี้
          </button>
        </div>
      </div>
    );
  }

  if (liffLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">กำลังเชื่อมต่อ LINE...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[40px] shadow-sm border-b border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Truck size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">ลงทะเบียนรถร่วม</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Driver Registration</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-600' : 'bg-slate-100'}`}
            ></div>
          ))}
        </div>
      </div>

      <div className="px-6 -mt-4">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 stagger">
          
          {/* Step 1: Personal Info & GPS */}
          {step === 1 && (
            <div className="space-y-6 animate-slide-up">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-4">
                <MapPin className="text-amber-600 shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-black text-amber-900 mb-1">สิทธิ์การเข้าถึงตำแหน่ง (GPS)</p>
                  <p className="text-xs font-medium text-amber-700 leading-relaxed mb-3">
                    เพื่อใช้ในการแนะนำงานที่อยู่ใกล้คุณ และบันทึกเส้นทางเพื่อคำนวณคาร์บอนฟุตพริ้นท์
                  </p>
                  {gpsStatus === 'granted' ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                      <CheckCircle size={14} /> อนุญาตแล้ว
                    </div>
                  ) : (
                    <button 
                      onClick={requestGps}
                      className="px-4 py-2 bg-white border border-amber-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-amber-900 shadow-sm"
                    >
                      กดอนุญาต GPS
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">ชื่อ-นามสกุล</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="กรอกชื่อและนามสกุลจริง"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={form.displayName}
                    onChange={(e) => setForm({...form, displayName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">เบอร์โทรศัพท์</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="tel" 
                    placeholder="08X-XXX-XXXX"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium font-mono"
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                  />
                </div>
              </div>

              <button 
                disabled={!form.displayName || !form.phone || gpsStatus !== 'granted'}
                onClick={() => setStep(2)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
              >
                ขั้นตอนต่อไป <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Vehicle & CFO Info */}
          {step === 2 && (
            <div className="space-y-6 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <Fuel size={20} className="text-blue-500" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">ข้อมูลรถและพลังงาน (CFO Metrics)</h2>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-2">
                <p className="text-[11px] font-black text-blue-800">📢 ประกาศรับสมัคร</p>
                <p className="text-[10px] font-bold text-blue-600 mt-0.5">ปัจจุบันระบบเปิดรับเฉพาะกลุ่มรถเทรลเลอร์เท่านั้น</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">ประเภทรถที่ใช้งาน</label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                  value={form.vehicleType}
                  onChange={(e) => setForm({...form, vehicleType: e.target.value})}
                >
                  <option value="Trailer 22W">รถพ่วง/เทรลเลอร์ 22 ล้อ</option>
                  <option value="Trailer 18W">รถพ่วง/เทรลเลอร์ 18 ล้อ</option>
                  <option value="10-Wheel">รถบรรทุก 10 ล้อ</option>
                  <option value="6-Wheel">รถบรรทุก 6 ล้อ</option>
                  <option value="Pickup 4W">รถกระบะ 4 ล้อ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">ประเภทเชื้อเพลิง</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    value={form.fuelType}
                    onChange={(e) => setForm({...form, fuelType: e.target.value})}
                  >
                    <option value="Diesel B7">ดีเซล B7</option>
                    <option value="Diesel B20">ดีเซล B20</option>
                    <option value="Gasoline 95">แก๊สโซฮอล์ 95</option>
                    <option value="EV">ไฟฟ้า (EV)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">ขนาดเครื่องยนต์</label>
                  <input 
                    type="text" 
                    placeholder="เช่น 12,000cc"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    value={form.engineSize}
                    onChange={(e) => setForm({...form, engineSize: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">เลขทะเบียนรถ</label>
                <input 
                  type="text" 
                  placeholder="เช่น 1กข 1234 กทม"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                  value={form.licensePlate}
                  onChange={(e) => setForm({...form, licensePlate: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all active:scale-95"
                >
                  ย้อนกลับ
                </button>
                <button 
                  disabled={!form.licensePlate}
                  onClick={() => setStep(3)}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  ขั้นตอนสุดท้าย <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Document Upload */}
          {step === 3 && (
            <div className="space-y-6 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={20} className="text-blue-500" />
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">เอกสารยืนยันตัวตน (Verification)</h2>
              </div>

              <p className="text-[11px] font-bold text-slate-400 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic leading-relaxed">
                💡 สามารถข้ามขั้นตอนนี้และส่งเอกสารผ่านทาง LINE แชทได้หากไม่สะดวกอัปโหลดในขณะนี้
              </p>

              {/* ID Card Upload */}
              <label className="block">
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'idCardUrl')} 
                />
                <div 
                  className={`relative overflow-hidden rounded-[28px] border-2 border-dashed p-8 text-center transition-all cursor-pointer ${form.idCardUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}
                >
                  {form.idCardUrl ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle size={32} className="text-emerald-500 mb-2" />
                      <p className="text-sm font-black text-emerald-700">เลือกรูปบัตรประชาชนแล้ว</p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">คลิกเพื่อเปลี่ยนไฟล์</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                        <Camera size={24} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-black text-slate-700">อัปโหลดบัตรประชาชน</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">รูปภาพ หรือ PDF (ถ้ามี)</p>
                    </div>
                  )}
                </div>
              </label>

              {/* Driving License Upload */}
              <label className="block">
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'licenseUrl')} 
                />
                <div 
                  className={`relative overflow-hidden rounded-[28px] border-2 border-dashed p-8 text-center transition-all cursor-pointer ${form.licenseUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}
                >
                  {form.licenseUrl ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle size={32} className="text-emerald-500 mb-2" />
                      <p className="text-sm font-black text-emerald-700">เลือกรูปใบขับขี่แล้ว</p>
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">คลิกเพื่อเปลี่ยนไฟล์</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                        <ShieldCheck size={24} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-black text-slate-700">อัปโหลดใบขับขี่รถบรรทุก</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">รูปภาพ หรือ PDF (ถ้ามี)</p>
                    </div>
                  )}
                </div>
              </label>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700 animate-bounce-subtle">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm transition-all active:scale-95"
                >
                  ย้อนกลับ
                </button>
                <button 
                  disabled={loading}
                  onClick={handleSubmit}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'ส่งข้อมูลเพื่อขออนุมัติ'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="px-10 mt-8 text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
          🔒 ข้อมูลของคุณจะถูกเก็บเป็นความลับและใช้เพื่อการตรวจสอบความปลอดภัยของสินค้าเท่านั้น
        </p>
      </div>
    </div>
  );
}
