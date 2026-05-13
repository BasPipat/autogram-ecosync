'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  Truck, MapPin, Navigation, Package,
  ChevronRight, Search, Filter, Loader2,
  AlertCircle, Info
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import liff from '@line/liff';

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

      // 1. If no lineUserId in URL, try LIFF
      const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';
      if (!finalLineUserId && liffId) {
        try {
          await liff.init({ liffId });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            finalLineUserId = profile.userId;
          }
        } catch (err) {
          console.error('LIFF Init Error in Job Board:', err);
        }
      }

      // 2. Check Status if we have a lineUserId
      if (finalLineUserId) {
        setResolvedLineUserId(finalLineUserId);
        try {
          const statusRes = await fetch(`/api/driver/status?lineUserId=${finalLineUserId}`);
          const statusData = await statusRes.json();
          
          if (!statusData.isRegistered || statusData.status !== 'approved') {
            alert('กรุณาลงทะเบียนหรือรอการตรวจสอบเอกสารก่อนเริ่มใช้งานครับ');
            router.replace('/driver/register');
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
              if (liff.isInClient()) {
                liff.closeWindow();
              } else {
                router.push('/driver/register');
              }
            }}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg shadow-slate-200"
          >
            ไปหน้าลงทะเบียน / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  return (
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

        {/* Location Badge */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Navigation size={14} className={location ? 'text-blue-500' : 'text-slate-300'} />
          </div>
          <p className="text-[11px] font-bold text-slate-600">
            {location ? 'กำลังแสดงงานที่อยู่ใกล้คุณ (200km)' : 'กรุณาเปิด GPS เพื่อดูงานใกล้เคียง'}
          </p>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-4"></div>
              <div className="h-20 bg-slate-50 rounded-2xl mb-4"></div>
              <div className="h-10 bg-slate-100 rounded-2xl"></div>
            </div>
          ))
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500 italic">ขออภัย... ยังไม่มีงานสาธารณะในขณะนี้</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job._id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:border-emerald-200 transition-all active:scale-[0.98] stagger">
              <div className="flex justify-between items-start mb-4">
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
                <div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-100">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase">ค่าเที่ยว</p>
                  <p className="text-xs font-black text-emerald-700">ดูราคา</p>
                </div>
              </div>

              <button
                onClick={() => window.location.href = `/trips/${job._id}?lineUserId=${resolvedLineUserId || ''}`}
                className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
              >
                ดูรายละเอียดงาน <ChevronRight size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle size={18} />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}
    </div>
  );
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
