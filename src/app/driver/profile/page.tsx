'use client';

import React from 'react';
import { User, ShieldCheck, Phone, CreditCard, ChevronRight, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DriverProfilePage() {
  const router = useRouter();

  const menuItems = [
    { icon: <User size={20} />, label: 'ข้อมูลส่วนตัว', path: '#' },
    { icon: <ShieldCheck size={20} />, label: 'สถานะการตรวจสอบ', path: '/driver/register' },
    { icon: <Phone size={20} />, label: 'ติดต่อเจ้าหน้าที่', path: 'https://line.me/ti/p/@your_id' },
    { icon: <CreditCard size={20} />, label: 'ข้อมูลการรับเงิน', path: '#' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-slate-900 pt-16 pb-12 px-6 rounded-b-[40px] shadow-lg shadow-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-emerald-500 rounded-full border-4 border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-xl">
            A
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Driver Profile</h1>
            <p className="text-emerald-400 text-sm font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Verified Account
            </p>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-6 -mt-6">
        <div className="bg-white rounded-[32px] p-2 shadow-xl shadow-slate-100 overflow-hidden border border-slate-100">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => item.path !== '#' && router.push(item.path)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group"
              style={{ borderBottom: index !== menuItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                  {item.icon}
                </div>
                <span className="font-bold text-slate-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-all" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-6 mt-8">
        <button 
          className="w-full py-5 bg-white border border-rose-100 text-rose-500 rounded-[28px] font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
        >
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </div>

      {/* Version Tag */}
      <p className="text-center text-[10px] text-slate-300 mt-10 font-bold uppercase tracking-widest">
        Autogram Eco-Sync v1.0.4
      </p>
    </div>
  );
}
