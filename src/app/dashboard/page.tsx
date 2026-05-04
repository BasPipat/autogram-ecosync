'use client';

import SidebarLayout from '@/components/SidebarLayout';
import React, { useEffect, useState } from 'react';
import { Leaf, Truck, FileCheck, ArrowRight, Loader2, UploadCloud, X, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalTrips: 0, totalCarbon: "0.00", verifiedPODs: 0 });
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [podUrl, setPodUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTripId, setVerifyTripId] = useState('');
  const [verifyImageUrl, setVerifyImageUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchDashboardData = () => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data.stats);
          setTrips(data.recentTrips);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenModal = (tripId: string) => {
    setSelectedTrip(tripId);
    setPodUrl('');
    setIsModalOpen(true);
  };

  const handleUploadPOD = async () => {
    if (!podUrl) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/vault/upload-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: selectedTrip, podImageUrl: podUrl })
      });
      if (response.ok) {
        setIsModalOpen(false);
        fetchDashboardData();
      } else {
        alert("อัปโหลดไม่สำเร็จ");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenVerifyModal = async (tripId: string) => {
    setVerifyTripId(tripId);
    setIsVerifyModalOpen(true);
    setVerifyImageUrl('');
    setVerifyImageUrl('https://placehold.co/600x800/e2e8f0/64748b?text=POD+Document');
  };

  const handleVerifyPOD = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/vault/verify-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: verifyTripId })
      });
      if (response.ok) {
        setIsVerifyModalOpen(false);
        fetchDashboardData();
      } else {
        alert("อนุมัติไม่สำเร็จ");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center text-emerald-500">
          <Loader2 className="animate-spin w-10 h-10" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#071022] p-8 font-sans text-slate-100">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Leaf className="text-emerald-500" size={32} /> Autogram Eco-Sync
            </h1>
            <p className="text-slate-500 mt-1">Sustainability Dashboard & Integrity Vault</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-[0_30px_80px_-50px_rgba(16,185,129,0.25)] backdrop-blur-xl">
            <span className="text-sm text-slate-300">สถานะระบบ: </span>
            <span className="text-sm font-semibold text-emerald-300 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_30px_60px_-30px_rgba(16,185,129,0.25)] flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-300 font-medium mb-1">ยอดคาร์บอนสะสม (kgCO2e)</p>
              <h2 className="text-3xl font-bold text-emerald-300">{stats.totalCarbon}</h2>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl"><Leaf className="text-emerald-300" size={24} /></div>
          </div>
          <div className="bg-white/10 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_30px_60px_-30px_rgba(16,185,129,0.22)] flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-300 font-medium mb-1">เที่ยววิ่งทั้งหมด (Trips)</p>
              <h2 className="text-3xl font-bold text-slate-100">{stats.totalTrips}</h2>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-2xl"><Truck className="text-cyan-300" size={24} /></div>
          </div>
          <div className="bg-white/10 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_30px_60px_-30px_rgba(16,185,129,0.18)] flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-300 font-medium mb-1">POD ที่ตรวจสอบแล้ว</p>
              <h2 className="text-3xl font-bold text-slate-100">{stats.verifiedPODs}</h2>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-2xl"><FileCheck className="text-cyan-300" size={24} /></div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_80px_-50px_rgba(16,185,129,0.18)] overflow-hidden backdrop-blur-xl">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">รายการเดินรถล่าสุด</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-slate-300 text-sm">
                  <th className="p-4">รหัสงาน (Trip ID)</th>
                  <th className="p-4">เส้นทาง</th>
                  <th className="p-4">คาร์บอน (kgCO2e)</th>
                  <th className="p-4">สถานะหลักฐาน (POD)</th>
                  <th className="p-4">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">ยังไม่มีข้อมูล</td></tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip.id} className="border-b border-slate-50">
                      <td className="p-4 font-medium">{trip.id}</td>
                      <td className="p-4 text-slate-600">{trip.origin} <ArrowRight size={14} className="inline mx-1" /> {trip.dest}</td>
                      <td className="p-4 text-slate-600">{trip.carbon}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          trip.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' :
                          trip.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {trip.status === 'No POD' ? (
                          <button onClick={() => handleOpenModal(trip.id)} className="text-sm bg-emerald-500/15 text-emerald-200 px-3 py-1 rounded-full hover:bg-emerald-500/25 transition">อัปโหลด</button>
                        ) : trip.status === 'Pending' ? (
                          <button onClick={() => handleOpenVerifyModal(trip.id)} className="text-sm bg-amber-500/15 text-amber-200 px-3 py-1 rounded-full hover:bg-amber-500/25 transition">ตรวจสอบรูป</button>
                        ) : (
                          <span className="text-sm text-emerald-300 flex items-center gap-1"><CheckCircle size={16} /> อนุมัติแล้ว</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><UploadCloud className="text-blue-600" /> อัปโหลดใบส่งของ</h3>
              <div className="mb-4">
                {podUrl ? (
                  <div className="w-full h-48 bg-slate-100"><img src={podUrl} className="w-full h-full object-contain" alt="POD" /></div>
                ) : (
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPodUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-2xl border border-white/10 bg-slate-900/80 text-slate-200 hover:bg-slate-900">ยกเลิก</button>
                <button disabled={isUploading} onClick={handleUploadPOD} className="px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-60">บันทึกหลักฐาน</button>
              </div>
            </div>
          </div>
        )}

        {isVerifyModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileCheck className="text-amber-600" /> ตรวจสอบความถูกต้อง
                </h3>
                <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <p className="text-sm text-slate-600 mb-2">รหัสงาน: <strong>{verifyTripId}</strong></p>
              <div className="flex-1 bg-slate-100 rounded-lg overflow-auto border border-slate-200 mb-4 min-h-[300px] flex items-center justify-center">
                {verifyImageUrl ? (
                  <img src={verifyImageUrl} alt="POD Document" className="max-w-full h-auto object-contain" />
                ) : (
                  <Loader2 className="animate-spin text-slate-400" />
                )}
              </div>
              <div className="flex justify-end gap-3 mt-auto">
                <button onClick={() => setIsVerifyModalOpen(false)} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                  ปฏิเสธ (ไม่อนุมัติ)
                </button>
                <button
                  onClick={handleVerifyPOD} disabled={isVerifying}
                  className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={18} />}
                  อนุมัติหลักฐาน
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
