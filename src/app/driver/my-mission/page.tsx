'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package } from 'lucide-react';
import { useLIFF } from '@/components/LIFFProvider';

export default function MyMissionPage() {
  const router = useRouter();
  const { lineUserId: liffUserId, isLoggedIn, isInitializing } = useLIFF();
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('กำลังเริ่มระบบ LINE...');
  const hasFetched = useRef(false);

  useEffect(() => {
    // Check for manual bypass ID first (for admin testing)
    const params = new URLSearchParams(window.location.search);
    const manualId = params.get('lineUserId');

    if (manualId) {
      // Bypass mode: use manual ID directly
      if (!hasFetched.current) {
        hasFetched.current = true;
        fetchMission(manualId);
      }
      return;
    }

    // Wait for LIFF to finish initializing
    if (isInitializing) {
      setStatusMsg('กำลังเริ่มระบบ LINE...');
      return;
    }

    // LIFF is done, check login status
    if (!isLoggedIn || !liffUserId) {
      // Not logged in - trigger login (only once)
      if (!hasFetched.current) {
        hasFetched.current = true;
        setStatusMsg('กำลังนำไปยืนยันตัวตน...');
        import('@line/liff').then(({ default: liff }) => {
          liff.login({ redirectUri: window.location.origin + '/driver/my-mission' });
        });
      }
      return;
    }

    // Logged in with valid userId
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchMission(liffUserId);
    }
  }, [isInitializing, isLoggedIn, liffUserId]);

  const fetchMission = async (userId: string) => {
    setStatusMsg('กำลังค้นหาภารกิจ...');

    // Clean URL
    window.history.replaceState({}, '', '/driver/my-mission');

    try {
      const res = await fetch(`/api/driver/active-trip?lineUserId=${userId}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setError(`ไม่พบข้อมูลคนขับในระบบ\nกรุณาลงทะเบียนก่อนใช้งานครับ`);
        } else if (res.status === 403) {
          setError('บัญชีของคุณยังไม่ได้รับการอนุมัติ\nกรุณารอการอนุมัติจากแอดมินครับ');
        } else {
          setError(data.error || 'ไม่สามารถโหลดข้อมูลได้');
        }
        return;
      }

      if (data.activeTripId) {
        router.replace(`/trips/${userId}`);
      } else {
        setError('ขณะนี้ยังไม่มีภารกิจที่กำลังดำเนินการครับ');
      }
    } catch {
      setError('เกิดปัญหาในการเชื่อมต่อ\nกรุณาลองใหม่อีกครั้งครับ');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      {error ? (
        <div className="max-w-sm w-full px-6 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Package size={40} />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-3">ตรวจสอบสถานะงาน</h2>
          <p className="text-slate-500 font-medium mb-8 whitespace-pre-line">{error}</p>
          <div className="grid gap-3">
            <button
              onClick={() => { hasFetched.current = false; window.location.reload(); }}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg"
            >
              ลองตรวจสอบอีกครั้ง
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-slate-600 font-medium">{statusMsg}</p>
        </div>
      )}
    </div>
  );
}
