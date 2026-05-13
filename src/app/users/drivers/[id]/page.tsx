'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Truck, ShieldCheck, Phone, CreditCard, 
  ChevronLeft, Loader2, Calendar, FileText, 
  CheckCircle2, AlertCircle, ExternalLink, 
  Trash2, Wallet, MapPin, BarChart3, Clock,
  ArrowRight
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import { useRouter } from 'next/navigation';

interface IDriverDetail {
  driver: any;
  truck: any;
  documents: any[];
  stats: {
    totalTrips: number;
    totalEarnings: number;
    tripHistory: any[];
  };
}

export default function DriverProfileDeepDive({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [params, setParams] = React.useState<{ id: string } | null>(null);
  const [data, setData] = useState<IDriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'info' | 'documents' | 'history'>('overview');

  useEffect(() => {
    paramsPromise.then(setParams);
  }, [paramsPromise]);

  useEffect(() => {
    if (params?.id) {
      fetchDriverData(params.id);
    }
  }, [params?.id]);

  const fetchDriverData = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error('Failed to fetch driver data');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!params?.id || !confirm(`ยืนยันการเปลี่ยนสถานะเป็น ${status}?`)) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/drivers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchDriverData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const toggleVerification = async () => {
    if (!data || !params?.id) return;
    const newValue = !data.driver.isDocumentsVerified;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/drivers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDocumentsVerified: newValue })
      });
      if (res.ok) {
        fetchDriverData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      </SidebarLayout>
    );
  }

  if (!data) {
    return (
      <SidebarLayout>
        <div className="p-10 text-center">
          <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
          <h2 className="text-xl font-bold">ไม่พบข้อมูลคนขับ</h2>
          <button onClick={() => router.back()} className="mt-4 text-blue-500 hover:underline">ย้อนกลับ</button>
        </div>
      </SidebarLayout>
    );
  }

  const { driver, truck, documents, stats } = data;

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6 bg-slate-50">
        {/* Breadcrumb & Quick Actions */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm"
          >
            <ChevronLeft size={18} />
            กลับหน้าจัดการผู้ใช้
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleVerification}
              disabled={updating}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm border ${
                driver.isDocumentsVerified 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : 'bg-white text-slate-400 border-slate-200'
              }`}
            >
              {driver.isDocumentsVerified ? <ShieldCheck size={16} /> : <Clock size={16} />}
              {driver.isDocumentsVerified ? 'เอกสารตรวจสอบแล้ว' : 'ยังไม่ได้ตรวจสอบเอกสาร'}
            </button>
            
            <div className="h-6 w-[1px] bg-slate-200 mx-2" />

            {driver.status !== 'approved' && (
              <button
                onClick={() => handleUpdateStatus('approved')}
                disabled={updating}
                className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
              >
                อนุมัติคนขับ
              </button>
            )}
            {driver.status !== 'rejected' && (
              <button
                onClick={() => handleUpdateStatus('rejected')}
                disabled={updating}
                className="px-6 py-2 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
              >
                ไม่ผ่าน
              </button>
            )}
          </div>
        </div>

        {/* Header Profile Section */}
        <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 mb-8 border border-slate-100 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              {driver.pictureUrl ? (
                <img 
                  src={driver.pictureUrl} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-[40px] object-cover border-4 border-slate-50 shadow-inner"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-100 rounded-[40px] flex items-center justify-center text-slate-400 border-4 border-slate-50 shadow-inner">
                  <User size={48} />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-lg border-2 border-white">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{driver.displayName || 'Unnamed Driver'}</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  driver.status === 'approved' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 
                  driver.status === 'rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                  'bg-orange-50 text-orange-500 border-orange-100'
                }`}>
                  {driver.status}
                </span>
              </div>
              <p className="text-slate-400 font-mono text-xs mb-6 tracking-wider">{driver.lineUserId}</p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <Phone size={16} className="text-blue-500" />
                  <span className="text-sm font-bold text-slate-700">{driver.phone || truck?.driverPhone || 'ไม่ระบุเบอร์'}</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <Truck size={16} className="text-emerald-500" />
                  <span className="text-sm font-bold text-slate-700">{truck?.headPlateNumber || 'ไม่มีข้อมูลรถ'}</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <MapPin size={16} className="text-orange-500" />
                  <span className="text-sm font-bold text-slate-700">{driver.lastLocation?.address || 'ไม่พบพิกัด'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-white/50 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-sm animate-fade-in">
          {[
            { id: 'overview', label: 'ภาพรวมผลงาน', icon: BarChart3 },
            { id: 'info', label: 'ข้อมูลส่วนตัว & รถ', icon: User },
            { id: 'documents', label: 'คลังเอกสาร', icon: FileText },
            { id: 'history', label: 'ประวัติงาน', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">งานที่สำเร็จ</p>
                <h3 className="text-3xl font-black text-slate-900">{stats.totalTrips} <span className="text-sm text-slate-300">เที่ยว</span></h3>
              </div>
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                  <Wallet size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">รายได้รวมสะสม</p>
                <h3 className="text-3xl font-black text-slate-900">฿{stats.totalEarnings.toLocaleString()}</h3>
              </div>
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-6">
                  <Clock size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ประวัติงานล่าสุด</p>
                <button onClick={() => setActiveTab('history')} className="text-orange-500 text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                  ดูทั้งหมด <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                  <User size={18} className="text-slate-400" /> ข้อมูลพื้นฐาน
                </h3>
                <div className="space-y-6">
                  <InfoRow label="ชื่อคนขับ" value={driver.displayName} />
                  <InfoRow label="เบอร์โทรศัพท์" value={driver.phone || truck?.driverPhone} />
                  <InfoRow label="LINE User ID" value={driver.lineUserId} className="font-mono text-[11px]" />
                  <InfoRow label="สถานะปัจจุบัน" value={driver.status} />
                </div>
              </div>
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                  <Truck size={18} className="text-slate-400" /> ข้อมูลยานพาหนะ
                </h3>
                <div className="space-y-6">
                  <InfoRow label="ทะเบียนรถ" value={truck?.headPlateNumber} />
                  <InfoRow label="ประเภทรถ" value={truck?.vehicleInsuranceType || driver.vehicleType} />
                  <InfoRow label="ประเภทเชื้อเพลิง" value={driver.fuelType} />
                  <InfoRow label="ประกันสินค้า" value={truck?.cargoInsuranceAmount ? `฿${truck.cargoInsuranceAmount.toLocaleString()}` : '-'} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                  <FileText size={18} className="text-slate-400" /> คลังรูปเอกสาร ({documents.length})
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <CheckCircle2 size={14} className="text-emerald-500" /> ตรวจสอบไฟล์ภาพจาก LINE
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="py-20 text-center text-slate-300">
                  <FileText size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-xs">ยังไม่มีการส่งเอกสาร</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.map((doc: any) => (
                    <div key={doc._id} className="group relative bg-slate-50 rounded-[24px] overflow-hidden border border-slate-100 hover:border-emerald-200 transition-all hover:shadow-lg">
                      <div className="aspect-[4/3] relative">
                        <img 
                          src={`/api/admin/line-driver-documents/${doc._id}/content`} 
                          alt={doc.documentType}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                          <a 
                            href={`/api/admin/line-driver-documents/${doc._id}/content`} 
                            target="_blank"
                            className="w-full py-3 bg-white/20 backdrop-blur-md text-white rounded-xl text-xs font-black uppercase tracking-widest text-center hover:bg-white/30 transition-all border border-white/30"
                          >
                            ดูภาพขยาย
                          </a>
                        </div>
                      </div>
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{doc.documentType}</p>
                          <p className="text-[11px] font-bold text-slate-700">{new Date(doc.createdAt).toLocaleDateString('th-TH')}</p>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    {['วันที่', 'Job ID', 'เส้นทาง', 'ค่าเที่ยว', 'สถานะ'].map(h => (
                      <th key={h} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stats.tripHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                        ยังไม่มีประวัติการวิ่งงาน
                      </td>
                    </tr>
                  ) : (
                    stats.tripHistory.map((trip: any) => (
                      <tr key={trip._id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-slate-600">{new Date(trip.createdAt).toLocaleDateString('th-TH')}</td>
                        <td className="px-8 py-5 font-mono text-xs font-bold text-blue-500">{trip._id.slice(-8).toUpperCase()}</td>
                        <td className="px-8 py-5 font-bold text-slate-700">
                          {trip.pickupName} → {trip.dropoffName}
                        </td>
                        <td className="px-8 py-5 font-black text-slate-900">฿{(trip.freightPrice || 0).toLocaleString()}</td>
                        <td className="px-8 py-5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            trip.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

function InfoRow({ label, value, className = "" }: { label: string, value: any, className?: string }) {
  return (
    <div className="flex items-center justify-between group">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-bold text-slate-700 ${className}`}>{value || '-'}</span>
    </div>
  );
}
