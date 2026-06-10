'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Truck, MapPin, Navigation, Package,
  ChevronRight, Search, Filter, Loader2,
  AlertCircle, Info
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';

function JobBoardContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const lineUserId = searchParams.get('lineUserId');
  const router = useRouter();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedLineUserId, setResolvedLineUserId] = useState(lineUserId || '');
  const [fuelPrice, setFuelPrice] = useState<number>(39.94);

  // Bulk Selection States
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkOffers, setBulkOffers] = useState<{ job: any; price: string }[]>([]);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Price Reveal States
  const [revealedPrices, setRevealedPrices] = useState<{ [key: string]: boolean }>({});

  const togglePriceReveal = (jobId: string) => {
    setRevealedPrices(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const fetchFuelPrice = async () => {
    try {
      const r = await fetch('/api/external/fuel-prices');
      const data = await r.json();
      if (data.diesel_b7) setFuelPrice(data.diesel_b7);
    } catch (e) { console.error('Fuel price fetch error', e); }
  };

  useEffect(() => {
    fetchFuelPrice();
  }, []);

  const getRecommendedPrice = (job: any) => {
    const d = Number(job.distance) || 0;
    const w = Number(job.weight) || 0;
    const containerFee = job.cargoType === 'ตู้' ? 3000 : 0;
    const baseFee = job.cargoType === 'โลวเบท' ? 5000 : 0;

    // 1. Calculate standard modeling price P
    let fe = Math.max(2.0, 4.0 - (w * 0.05));
    const emptyFE = Number((fe * 1.25).toFixed(1));
    let ladenFuelCost = (d / fe) * fuelPrice;
    let emptyFuelCost = (job.cargoType === 'ตู้') ? (d / emptyFE) * fuelPrice : 0;
    let fuelCost = ladenFuelCost + emptyFuelCost;
    
    let profit = 7000;
    if (d <= 250) profit = 3500;
    else if (d <= 450) profit = 5000;

    if (job.cargoType === 'โลวเบท') {
      fe = Math.max(1.2, 3.0 - (w * 0.06));
      ladenFuelCost = (d / fe) * fuelPrice;
      emptyFuelCost = 0;
      fuelCost = ladenFuelCost;
      if (d <= 250) profit = 5000;
      else if (d <= 450) profit = 7000;
      else profit = 10000;
    }

    const rawP = (fuelCost + baseFee + profit) / 0.9;
    const modelingPrice = Math.ceil(rawP / 10) * 10;

    // 2. Check customer agreed price and cap at modelingPrice if higher
    if (job.acceptedFreightPrice !== undefined && job.acceptedFreightPrice > 0) {
      const derivedP = ((job.acceptedFreightPrice / 1.4) - containerFee) / 1.4;
      const derivedPrice = Math.ceil(derivedP / 10) * 10;
      
      if (derivedPrice > modelingPrice) {
        return modelingPrice;
      }
      return derivedPrice;
    }

    return modelingPrice;
  };

  const handleToggleSelect = (jobId: string) => {
    setSelectedJobIds(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedJobIds.length === jobs.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(jobs.map(j => j._id));
    }
  };

  const handleOpenBulkModal = () => {
    const selectedJobs = jobs.filter(j => selectedJobIds.includes(j._id));
    const initialOffers = selectedJobs.map(job => ({
      job,
      price: getRecommendedPrice(job).toString(),
    }));
    setBulkOffers(initialOffers);
    setBulkModalOpen(true);
  };

  const handleUpdateBulkPrice = (idx: number, price: string) => {
    setBulkOffers(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], price };
      return next;
    });
  };

  const handleSubmitBulk = async () => {
    setSubmittingBulk(true);
    try {
      const offers = bulkOffers.map(o => ({
        tripId: o.job._id,
        basePrice: Number(o.price.replace(/,/g, '').trim()),
      }));

      const res = await fetch('/api/admin/line-job-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'ส่งงานแบบกลุ่มไม่สำเร็จ');
        return;
      }

      alert(data.message || 'ส่งงานเข้ากลุ่ม LINE สำเร็จทั้งหมด');
      setBulkModalOpen(false);
      setSelectedJobIds([]);
      fetchJobs(location?.lat, location?.lng);
    } catch (err) {
      alert('ระบบขัดข้องขณะส่งงานกลุ่ม');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleSendToSharedTrucks = async (job: any) => {
    const calculatedP = getRecommendedPrice(job);
    const d = Number(job.distance) || 0;
    const w = Number(job.weight) || 0;

    const input = prompt(
      `ส่งงานเข้ากลุ่ม LINE สำหรับงาน ${job.tripId}\n\n` +
      `ระยะทาง: ${d} km | น้ำหนัก: ${w} ton | ประเภท: ${job.cargoType || 'ตู้'}\n` +
      `ราคาเสนอจ้างรถร่วมแนะนำ (P): ${calculatedP.toLocaleString()} บาท\n\n` +
      `กรุณายืนยันราคาจ้างรถร่วม (P):`,
      calculatedP.toString()
    );

    if (!input) return;

    const basePrice = Number(input.replace(/,/g, '').trim());
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      alert('กรุณากรอกราคาเป็นตัวเลขมากกว่า 0');
      return;
    }

    try {
      const res = await fetch('/api/admin/line-job-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: job._id, basePrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'ส่งงานเข้ากลุ่มไม่สำเร็จ');
        return;
      }
      alert(data.message || 'ส่งงานเข้ากลุ่ม LINE สำเร็จ');
      fetchJobs(location?.lat, location?.lng);
    } catch {
      alert('ระบบขัดข้องขณะส่งงานเข้ากลุ่ม');
    }
  };

  const fetchJobs = async (lat?: number, lng?: number, userId = resolvedLineUserId) => {
    setLoading(true);
    try {
      let url = `/api/driver/jobs?lineUserId=${userId || ''}`;
      if (lat && lng) {
        url += `&lat=${lat}&lng=${lng}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setJobs(data);
      } else {
        setError(data.error || 'Failed to load jobs');
      }
    } catch (err) {
      setError('System error. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAndCheckStatus = async () => {
      let finalLineUserId = lineUserId;

      // Check Status if we have a lineUserId
      if (finalLineUserId) {
        setResolvedLineUserId(finalLineUserId);
        try {
          const statusRes = await fetch(`/api/driver/status?lineUserId=${finalLineUserId}`);
          const statusData = await statusRes.json();
          
          if (!statusData.isRegistered || statusData.status !== 'approved') {
            alert('กรุณาลงทะเบียนหรือรอการตรวจสอบเอกสารก่อนเริ่มใช้งานครับ');
            router.replace(`/driver/register?lineUserId=${finalLineUserId}`);
            return;
          }
        } catch (err) {
          console.error('Status Check Error:', err);
        }
      }

      // 3. Get location and fetch jobs
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(coords);
            fetchJobs(coords.lat, coords.lng, finalLineUserId || '');
          },
          () => {
            fetchJobs(undefined, undefined, finalLineUserId || '');
          }
        );
      } else {
        fetchJobs(undefined, undefined, finalLineUserId || '');
      }
    };

    initAndCheckStatus();
  }, [lineUserId, router]);

  // Authorization Check
  const isSystemOwner = session?.user?.role === 'system_owner';
  const isAdmin = ['system_owner', 'owner', 'admin'].includes(session?.user?.role || '');
  const isAuthorized = isSystemOwner || !!resolvedLineUserId;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[32px] p-10 shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-500 text-sm font-medium mb-8">
            เฉพาะ System Owner และคนขับรถที่มีสิทธิ์เข้าถึงเท่านั้นที่จะเห็นหน้านี้
          </p>
          <button
            onClick={() => {
              router.push('/driver/register');
            }}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg shadow-slate-200"
          >
            ไปหน้าลงทะเบียน / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  const content = (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white px-6 pt-12 pb-6 rounded-b-[40px] shadow-sm border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <Search size={24} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Load Board</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Shipments</p>
            </div>
          </div>
          <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            <Filter size={20} />
          </button>
        </div>

        {/* Location & Admin Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 flex-grow">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Navigation size={14} className={location ? 'text-blue-500' : 'text-slate-300'} />
            </div>
            <p className="text-[11px] font-bold text-slate-600">
              {location ? 'กำลังแสดงงานที่อยู่ใกล้คุณ (200km)' : 'กรุณาเปิด GPS เพื่อดูงานใกล้เคียง'}
            </p>
          </div>

          {isAdmin && jobs.length > 0 && (
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all active:scale-[0.98] border border-slate-200/50 shrink-0"
            >
              <input
                type="checkbox"
                checked={selectedJobIds.length === jobs.length && jobs.length > 0}
                onChange={() => {}}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 pointer-events-none"
              />
              {selectedJobIds.length === jobs.length ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทั้งหมด'}
            </button>
          )}
        </div>
      </div>

      <div className="px-6 mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 animate-pulse flex flex-col h-full">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-4"></div>
              <div className="h-20 bg-slate-50 rounded-2xl mb-4"></div>
              <div className="h-10 bg-slate-100 rounded-2xl mt-auto"></div>
            </div>
          ))
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 col-span-full">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500 italic">ขออภัย... ยังไม่มีงานสาธารณะในขณะนี้</p>
          </div>
        ) : (
          jobs.map((job) => {
            const isSelected = selectedJobIds.includes(job._id);
            return (
              <div 
                key={job._id} 
                className={`bg-white rounded-[32px] p-6 shadow-sm border transition-all stagger relative flex flex-col h-full ${
                  isSelected 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/5' 
                    : 'border-slate-100 hover:border-emerald-200'
                }`}
              >
                {isAdmin && (
                  <div className="absolute top-6 right-6 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(job._id)}
                      className="h-5 w-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all"
                    />
                  </div>
                )}

                <div className="flex justify-between items-start mb-4 pr-8">
                  <div>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-wider border border-blue-100">
                      {job.cargoType || 'ตู้'}
                    </span>
                    <h3 className="text-md font-black text-slate-800 mt-2">{job.cargoName || 'สินค้าทั่วไป'}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Trip ID</p>
                    <p className="text-xs font-mono font-bold text-slate-600">{job.tripId}</p>
                  </div>
                </div>

                {/* Route */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">ต้นทาง</p>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{job.origin}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">ปลายทาง</p>
                      <p className="text-xs font-bold text-slate-700 line-clamp-1">{job.destination}</p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-slate-50/50 p-2 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">น้ำหนัก</p>
                    <p className="text-xs font-black text-slate-700">{job.weight} <span className="text-[9px] font-normal">ton</span></p>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">ระยะทาง</p>
                    <p className="text-xs font-black text-slate-700">{job.distance} <span className="text-[9px] font-normal">km</span></p>
                  </div>
                  <div 
                    onClick={() => togglePriceReveal(job._id)}
                    className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-all select-none"
                    title="คลิกเพื่อแสดง/ซ่อนราคา"
                  >
                    <p className="text-[9px] font-bold text-emerald-600 uppercase">ค่าเที่ยว</p>
                    <p className="text-xs font-black text-emerald-700">
                      {isAdmin || revealedPrices[job._id] 
                        ? `${getRecommendedPrice(job).toLocaleString()} ฿` 
                        : 'ดูราคา'}
                    </p>
                  </div>
                </div>

                {/* Buttons container at the bottom */}
                <div className="mt-auto space-y-2 w-full">
                  {isAdmin && (
                    <button
                      onClick={() => handleSendToSharedTrucks(job)}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Truck size={14} /> ส่งงานเข้ากลุ่ม LINE
                    </button>
                  )}

                  <button
                    onClick={() => window.location.href = `/trips/${job._id}?lineUserId=${resolvedLineUserId || ''}`}
                    className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                  >
                    ดูรายละเอียดงาน <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle size={18} />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      {/* Glassmorphic Bottom Bar */}
      {isAdmin && selectedJobIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-lg bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-[28px] p-4 shadow-2xl flex items-center justify-between gap-4 animate-slide-up">
          <div className="pl-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">เลือกแล้ว</p>
            <p className="text-sm font-black text-slate-800">{selectedJobIds.length} งาน</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedJobIds([])}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleOpenBulkModal}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Truck size={14} /> ส่งงานที่เลือก
            </button>
          </div>
        </div>
      )}

      {/* Bulk Confirmation Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fade-in border border-slate-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">ส่งงานเข้ากลุ่ม LINE แบบกลุ่ม</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ยืนยันราคาค่าจ้างรถร่วม (P)</p>
                </div>
              </div>
              <button 
                onClick={() => setBulkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-grow space-y-4">
              {bulkOffers.map((item, idx) => (
                <div key={item.job._id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded uppercase border border-blue-100">
                        {item.job.cargoType || 'ตู้'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">{item.job.tripId}</span>
                    </div>
                    <p className="text-xs font-black text-slate-800 line-clamp-1">
                      {item.job.origin} → {item.job.destination}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">
                      {item.job.distance} km | {item.job.weight} ton
                    </p>
                  </div>

                  <div className="w-full md:w-auto flex flex-col items-end gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ราคาเสนอ (P)</label>
                    <div className="relative rounded-xl shadow-sm w-full md:w-36">
                      <input
                        type="text"
                        value={item.price}
                        onChange={(e) => handleUpdateBulkPrice(idx, e.target.value)}
                        placeholder="ระบุราคาจ้าง"
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-right text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-8"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <span className="text-[10px] font-black text-slate-400">฿</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-400">
                เลือกทั้งหมด {bulkOffers.length} งาน
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
                  disabled={submittingBulk}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmitBulk}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-[0.98]"
                  disabled={submittingBulk}
                >
                  {submittingBulk ? (
                    <>
                      <Loader2 className="animate-spin" size={12} /> กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Truck size={12} /> ยืนยันส่งทั้งหมด ({bulkOffers.length} งาน)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Premium CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 40px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );

  if (isAdmin && !resolvedLineUserId) {
    return <SidebarLayout>{content}</SidebarLayout>;
  }
  return content;
}

export default function JobBoardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    }>
      <JobBoardContent />
    </Suspense>
  );
}
