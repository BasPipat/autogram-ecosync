'use client';

import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Phone, CreditCard, ChevronRight, LogOut, Loader2, MapPin, Truck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface IDriverProfile {
  displayName: string;
  phone?: string;
  status: string;
  pictureUrl?: string;
  vehicleType?: string;
  licensePlate?: string;
}

export default function DriverProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [driver, setDriver] = useState<IDriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Extract and Lock Identity from URL
    const urlId = searchParams.get('lineUserId');
    if (urlId && urlId !== 'null' && urlId !== 'undefined') {
      setLineUserId(urlId);
      fetchProfile(urlId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchProfile = async (id: string) => {
    try {
      const res = await fetch(`/api/driver/profile-data?lineUserId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setDriver(data);
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="font-bold text-sm uppercase tracking-widest">กำลังโหลดโปรไฟล์...</p>
      </div>
    );
  }

  if (!lineUserId && !driver) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <User size={32} className="text-rose-400" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">ไม่พบข้อมูลผู้ใช้งาน</h2>
        <p className="text-slate-500 text-sm mb-8 font-medium">กรุณาเข้าใช้งานผ่าน LINE OA @782wnmvm เท่านั้นครับ</p>
        <button 
          onClick={() => window.location.href = 'line://oaMessage/@782wnmvm/'}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm"
        >
          กลับไปที่ LINE
        </button>
      </div>
    );
  }

  const menuItems = [
    { icon: <User size={20} />, label: 'ข้อมูลส่วนตัว', value: driver?.displayName || 'รอดึงข้อมูล', path: '#' },
    { icon: <Phone size={20} />, label: 'เบอร์โทรศัพท์', value: driver?.phone || 'ยังไม่ได้ระบุ', path: '#' },
    { icon: <Truck size={20} />, label: 'ประเภทยานพาหนะ', value: driver?.vehicleType || 'ยังไม่ได้ระบุ', path: '#' },
    { icon: <CreditCard size={20} />, label: 'ข้อมูลการรับเงิน', value: 'จัดการบัญชี', path: '#' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-slate-900 pt-16 pb-12 px-6 rounded-b-[40px] shadow-lg shadow-slate-200">
        <div className="flex items-center gap-5">
          <div className="relative">
            {driver?.pictureUrl ? (
              <img 
                src={driver.pictureUrl} 
                alt="Profile" 
                className="w-20 h-20 rounded-full border-4 border-white/20 shadow-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-emerald-500 rounded-full border-4 border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-xl uppercase">
                {(driver?.displayName || 'D').charAt(0)}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
              <ShieldCheck size={20} className="text-emerald-500" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight">{driver?.displayName || 'Driver Profile'}</h1>
            <p className="text-emerald-400 text-[11px] font-black uppercase tracking-widest mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {driver?.status === 'approved' ? 'Verified Account' : 'Under Review'}
            </p>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-6 -mt-6">
        <div className="bg-white rounded-[32px] p-2 shadow-xl shadow-slate-100 overflow-hidden border border-slate-100">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group"
              style={{ borderBottom: index !== menuItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                  <p className="font-bold text-slate-700">{item.value}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-6 mt-8">
        <button 
          onClick={() => window.location.href = 'line://oaMessage/@782wnmvm/'}
          className="w-full py-5 bg-white border border-rose-100 text-rose-500 rounded-[28px] font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
        >
          <LogOut size={18} />
          กลับไปที่ LINE
        </button>
      </div>

      {/* Version Tag */}
      <p className="text-center text-[10px] text-slate-300 mt-10 font-bold uppercase tracking-widest">
        Autogram Eco-Sync v1.1.0
      </p>
    </div>
  );
}
