'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';
import { Loader2, Package } from 'lucide-react';

export default function MyMissionRedirect() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState('');

  const [isLiffLoading, setIsLiffLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initLiffAndRedirect = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        let finalLineUserId = queryParams.get('lineUserId') || '';
        const hasLoginCode = queryParams.has('code') || queryParams.has('liff.state');

        // 1. Try Initialize LIFF if available
        const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';
        
        if (liffId && !finalLineUserId) {
          try {
            await liff.init({ liffId });
            
            if (liff.isLoggedIn()) {
              const profile = await liff.getProfile();
              finalLineUserId = profile.userId;
            } else if (!hasLoginCode) {
              // Only trigger login if we are NOT in the middle of a redirect (no code)
              // and no manual ID was provided.
              liff.login({ redirectUri: window.location.origin + window.location.pathname });
              return;
            } else {
              // We have a code, wait for LIFF to process it
              console.log('Detected login code, waiting for LIFF processing...');
              await new Promise(r => setTimeout(r, 2000));
              if (liff.isLoggedIn()) {
                const profile = await liff.getProfile();
                finalLineUserId = profile.userId;
              }
            }
          } catch (err) {
            console.error('LIFF Init failed:', err);
          }
        }

        if (!isMounted) return;

        if (!finalLineUserId && !hasLoginCode) {
          setError('ไม่พบข้อมูลผู้ใช้งาน LINE กรุณาเข้าใช้งานผ่านปุ่มใน LINE OA ครับ');
          setIsLiffLoading(false);
          return;
        }

        if (!finalLineUserId && hasLoginCode) {
           // Still no ID but we have a code? Probably session issue.
           // Don't loop, show error.
           setError('เซสชัน LINE หมดอายุหรือผิดพลาด กรุณาลองใหม่อีกครั้งจาก LINE OA');
           setIsLiffLoading(false);
           return;
        }

        setLineUserId(finalLineUserId);
        
        // --- Cleanup URL: Remove sensitive/test ID from URL for security ---
        if (typeof window !== 'undefined' && (window.location.search.includes('lineUserId') || window.location.search.includes('code'))) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }

        // 2. Fetch status and active trip from API
        // SSOT: We wait slightly to allow Webhook to finish DB writes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const res = await fetch(`/api/driver/active-trip?lineUserId=${finalLineUserId}`);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 404) {
            setError(`ไม่พบข้อมูลคนขับในระบบสำหรับ ID: ${finalLineUserId.substring(0, 8)}... กรุณาลงทะเบียนก่อนใช้งานครับ`);
          } else {
            setError(data.error || 'ไม่สามารถโหลดข้อมูลงานได้ในขณะนี้');
          }
          return;
        }

        // 3. Smart Redirect Logic
        if (data.activeTripId) {
           // Direct to the personalized LINE ID URL
           router.replace(`/trips/${finalLineUserId}`);
        } else {
           // Show clear diagnostic info
           setError(`ขณะนี้ไม่พบภารกิจที่กำลังดำเนินการของพี่ยังครับ (ID: ${finalLineUserId.substring(0, 8)}...)`);
        }

        setIsLiffLoading(false);

      } catch (err: any) {
        console.error('Redirect Error:', err);
        setError('เกิดปัญหาในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
        setIsLiffLoading(false);
      }
    };

    initLiffAndRedirect();
    
    return () => { isMounted = false; };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      {error ? (
        <div className="max-w-sm w-full px-6 text-center">
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
              onClick={() => router.replace(`/driver/jobs?lineUserId=${lineUserId}`)}
              className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-sm"
            >
              ไปดูหน้างานว่าง
            </button>
          </div>
        </div>
      ) : isLiffLoading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">กำลังค้นหาภารกิจของคุณ...</p>
        </div>
      ) : null}
    </div>
  );
}
