'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Truck, ShieldCheck, Phone, CreditCard, 
  ChevronLeft, Loader2, Calendar, FileText, 
  CheckCircle2, AlertCircle, ExternalLink, 
  Trash2, Wallet, MapPin, BarChart3, Clock,
  ArrowRight, Pencil, Upload, Plus, Copy, Check, Radio
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        // Initialize edit form
        setEditForm({
          displayName: json.driver.displayName,
          driverFirstName: json.driver.driverFirstName || json.truck?.driverFirstName,
          driverLastName: json.driver.driverLastName || json.truck?.driverLastName,
          phone: json.driver.phone || json.truck?.driverPhone,
          driverLicenseType: json.driver.driverLicenseType || json.truck?.driverLicenseType,
          bankName: json.driver.bankName,
          bankAccountNumber: json.driver.bankAccountNumber,
          bankAccountName: json.driver.bankAccountName,
          headPlateNumber: json.truck?.headPlateNumber,
          tailPlateNumber: json.truck?.tailPlateNumber,
          vehicleType: json.truck?.vehicleType || json.driver.vehicleType,
          fuelType: json.driver.fuelType,
          cargoInsuranceAmount: json.truck?.cargoInsuranceAmount,
          compulsoryInsuranceExpiresAt: json.truck?.compulsoryInsuranceExpiresAt,
          vehicleInsuranceType: json.truck?.vehicleInsuranceType,
        });
      } else {
        console.error('Failed to fetch driver data');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!params?.id) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/drivers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setIsEditing(false);
        fetchDriverData(params.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
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
        fetchDriverData(params.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('ยืนยันการลบเอกสารนี้ออกจากระบบ?')) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/line-driver-documents?docId=${docId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (params?.id) fetchDriverData(params.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !params?.id) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lineUserId', params.id);
    formData.append('documentType', 'onboarding_media');

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/line-driver-documents', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchDriverData(params.id);
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
        fetchDriverData(params.id);
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
              <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                <p className="text-slate-400 font-mono text-xs tracking-wider">{driver.lineUserId}</p>
                <button 
                  onClick={() => copyToClipboard(driver.lineUserId)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                  title="คัดลอก LINE ID"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              
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
            <div className="space-y-8">
              <div className="flex justify-end">
                {isEditing ? (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={updating}
                      className="px-8 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      {updating && <Loader2 size={14} className="animate-spin" />}
                      บันทึกข้อมูลรถร่วม
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    <Pencil size={14} />
                    แก้ไขข้อมูล
                  </button>
                )}
              </div>

              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-12">
                {/* Vehicle Section */}
                <section>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-emerald-600">
                    <Truck size={20} /> ข้อมูลรถ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <EditableInfoRow 
                      label="ทะเบียนหัว*" 
                      value={truck?.headPlateNumber} 
                      isEditing={isEditing} 
                      field="headPlateNumber" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                    <EditableInfoRow 
                      label="ทะเบียนหาง*" 
                      value={truck?.tailPlateNumber} 
                      isEditing={isEditing} 
                      field="tailPlateNumber" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                    <EditableInfoRow 
                      label="พรบ. หมดอายุ*" 
                      value={truck?.compulsoryInsuranceExpiresAt} 
                      isEditing={isEditing} 
                      field="compulsoryInsuranceExpiresAt" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                      type="date"
                    />
                    <EditableInfoRow 
                      label="ประเภทประกันรถ*" 
                      value={truck?.vehicleInsuranceType} 
                      isEditing={isEditing} 
                      field="vehicleInsuranceType" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                    <EditableInfoRow 
                      label="ประกันสินค้า*" 
                      value={truck?.cargoInsuranceAmount} 
                      isEditing={isEditing} 
                      field="cargoInsuranceAmount" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                      type="number"
                    />
                    <EditableInfoRow 
                      label="ประเภทเชื้อเพลิง" 
                      value={driver.fuelType} 
                      isEditing={isEditing} 
                      field="fuelType" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                  </div>
                </section>

                </section>
                
                {/* LINE Connection Section */}
                <section>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-blue-600">
                    <Radio size={20} /> การเชื่อมต่อ LINE OA
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LINE User ID</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 font-mono">{driver.lineUserId}</span>
                        <button onClick={() => copyToClipboard(driver.lineUserId)} className="text-slate-400 hover:text-slate-600">
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <InfoRow label="สถานะ GPS Consent" value={driver.gpsConsentStatus} className={driver.gpsConsentStatus === 'granted' ? 'text-emerald-500' : 'text-orange-500'} />
                    <InfoRow label="ยินยอมเมื่อ" value={driver.gpsConsentAt ? new Date(driver.gpsConsentAt).toLocaleString('th-TH') : '-'} />
                  </div>
                </section>

                {/* Driver Section */}
                <section>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-slate-900">
                    <User size={20} /> ข้อมูลคนขับ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <EditableInfoRow 
                      label="ชื่อ*" 
                      value={driver.driverFirstName || truck?.driverFirstName} 
                      isEditing={isEditing} 
                      field="driverFirstName" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                    <EditableInfoRow 
                      label="นามสกุล*" 
                      value={driver.driverLastName || truck?.driverLastName} 
                      isEditing={isEditing} 
                      field="driverLastName" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                    <EditableInfoRow 
                      label="ประเภทใบขับขี่*" 
                      value={driver.driverLicenseType || truck?.driverLicenseType} 
                      isEditing={isEditing} 
                      field="driverLicenseType" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                    <EditableInfoRow 
                      label="เบอร์โทรศัพท์*" 
                      value={driver.phone || truck?.driverPhone} 
                      isEditing={isEditing} 
                      field="phone" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                  </div>
                </section>

                {/* Bank Section */}
                <section>
                  <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-slate-900">
                    <CreditCard size={20} /> ข้อมูลโอนเงิน
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <EditableInfoRow 
                      label="ธนาคาร*" 
                      value={driver.bankName} 
                      isEditing={isEditing} 
                      field="bankName" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                    <EditableInfoRow 
                      label="เลขบัญชี*" 
                      value={driver.bankAccountNumber} 
                      isEditing={isEditing} 
                      field="bankAccountNumber" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                    <EditableInfoRow 
                      label="ชื่อบัญชี*" 
                      value={driver.bankAccountName} 
                      isEditing={isEditing} 
                      field="bankAccountName" 
                      editForm={editForm} 
                      setEditForm={setEditForm} 
                    />
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                  <FileText size={18} className="text-slate-400" /> คลังรูปเอกสาร ({documents.length})
                </h3>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                    {updating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    อัปโหลดเอกสาร
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={updating} />
                  </label>
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-emerald-500" /> ตรวจสอบไฟล์ภาพจาก LINE
                  </div>
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
                    <div key={doc._id} className="group relative bg-slate-50 rounded-[24px] overflow-hidden border border-slate-100 hover:border-rose-200 transition-all hover:shadow-lg">
                      <div className="aspect-[4/3] relative">
                        <img 
                          src={`/api/admin/line-driver-documents/${doc._id}/content`} 
                          alt={doc.documentType}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-6">
                          <a 
                            href={`/api/admin/line-driver-documents/${doc._id}/content`} 
                            target="_blank"
                            className="px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-white/30 transition-all border border-white/30"
                          >
                            ดูภาพ
                          </a>
                          <button 
                            onClick={() => handleDeleteDocument(doc._id)}
                            className="p-2 bg-rose-500/80 backdrop-blur-md text-white rounded-xl hover:bg-rose-600 transition-all border border-rose-400/30"
                            title="ลบเอกสาร"
                          >
                            <Trash2 size={16} />
                          </button>
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

function EditableInfoRow({ label, value, isEditing, field, editForm, setEditForm, type = "text" }: any) {
  return (
    <div className="flex flex-col gap-2 group">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      {isEditing ? (
        <input 
          type={type}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-slate-900 transition-all"
          value={editForm[field] || ''}
          onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
        />
      ) : (
        <span className="text-sm font-bold text-slate-700">
          {field === 'cargoInsuranceAmount' && value ? `฿${Number(value).toLocaleString()}` : (value || '-')}
        </span>
      )}
    </div>
  );
}

function InfoRow({ label, value, className = "" }: { label: string, value: any, className?: string }) {
  return (
    <div className="flex flex-col gap-2 group">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-bold text-slate-700 ${className}`}>{value || '-'}</span>
    </div>
  );
}
