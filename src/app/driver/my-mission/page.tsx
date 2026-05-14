'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';
import { Loader2, Package } from 'lucide-react';
import { useLIFF } from '@/components/LIFFProvider';

export default function MyMissionRedirect() {
  const router = useRouter();
  const { lineUserId: liffUserId, isLoggedIn, isInitializing, error: liffError } = useLIFF();
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const loginTriggered = useRef(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const manualLineUserId = queryParams.get('lineUserId');
    const hasLoginCode = queryParams.has('code') || queryParams.has('liff.state');

    // 1. Wait for LIFF Initialization (unless we have a manual ID)
    if (isInitializing && !manualLineUserId) return;

    const handleRedirect = async () => {
      try {
        let finalLineUserId = manualLineUserId || liffUserId || '';

        // 2. If no ID and not logged in, and not in middle of login -> Trigger Login
        if (!finalLineUserId && !isLoggedIn && !hasLoginCode && !loginTriggered.current) {
          loginTriggered.current = true;
          liff.login({ redirectUri: window.location.origin + window.location.pathname });
          return;
        }

        // 3. If we have a code but no ID yet, just wait for the provider to update
        if (!finalLineUserId && hasLoginCode) {
          return; 
        }

        if (!finalLineUserId) {
          setError('ไม่พบข้อมูลผู้ใช้งาน LINE กรุณาเข้าใช้งานผ่านปุ่มใน LINE OA ครับ');
          return;
        }

        if (fetching) return;
        setFetching(true);

        // 4. Cleanup URL
        if (typeof window !== 'undefined' && (window.location.search.includes('lineUserId') || window.location.search.includes('code'))) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }

        // 5. Fetch Active Trip
        await new Promise(resolve => setTimeout(resolve, 800));
        const res = await fetch(`/api/driver/active-trip?lineUserId=${finalLineUserId}`);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 404) {
            setError(`ไม่พบข้อมูลคนขับในระบบสำหรับ ID: ${finalLineUserId.substring(0, 8)}...`);
          } else {
            setError(data.error || 'ไม่สามารถโหลดข้อมูลงานได้ในขณะนี้');
          }
          return;
        }

        if (data.activeTripId) {
          router.replace(`/trips/${finalLineUserId}`);
        } else {
          setError(`ขณะนี้ไม่พบภารกิจที่กำลังดำเนินการของพี่ยังครับ (ID: ${finalLineUserId.substring(0, 8)}...)`);
        }
      } catch (err: any) {
        console.error('Redirect Error:', err);
        setError('เกิดปัญหาในการเชื่อมต่อกับเซิร์ฟเวอร์');
      } finally {
        setFetching(false);
      }
    };

    handleRedirect();
  }, [isInitializing, isLoggedIn, liffUserId, router, fetching]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900">
      {error ? (
        <div className="max-w-sm w-full px-6 text-center animate-fade-in">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Package size={40} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">ตรวจสอบสถานะงาน</h2>
          <p className="text-slate-500 font-medium mb-8">{error}</p>
          
          <div className="grid gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100"
            >
              ลองตรวจสอบอีกครั้ง
            </button>
            <button 
              onClick={() => router.replace(`/driver/jobs`)}
              className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-sm"
            >
              ไปดูหน้างานว่าง
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium animate-pulse">
            {isInitializing ? 'กำลังเริ่มระบบ LINE...' : 'กำลังค้นหาภารกิจของคุณ...'}
          </p>
        </div>
      )}
    </div>
  );
}
