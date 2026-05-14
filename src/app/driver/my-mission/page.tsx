'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package } from 'lucide-react';

export default function MyMissionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('กำลังเริ่มระบบ...');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const run = async () => {
      // ── Manual bypass for admin/testing ──────────────────────
      const params = new URLSearchParams(window.location.search);
      const manualId = params.get('lineUserId');
      if (manualId) {
        await fetchMission(manualId);
        return;
      }

      // ── LIFF flow (LIFF endpoint now points HERE directly) ───
      const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';
      try {
        setStatusMsg('กำลังเชื่อมต่อ LINE...');
        const liff = (await import('@line/liff')).default;

        // liff.init() processes the `code` in URL and stores session
        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          setStatusMsg('กำลังค้นหาภารกิจ...');
          const profile = await liff.getProfile();
          await fetchMission(profile.userId);
        } else {
          // Not logged in → send to LINE login, return to THIS page
          setStatusMsg('กำลังนำไปยืนยันตัวตน...');
          liff.login({
            redirectUri: window.location.origin + '/driver/my-mission',
          });
        }
      } catch (err: any) {
        console.error('[MyMission] LIFF Error:', err);
        setError('เกิดปัญหาในการเชื่อมต่อ LINE\nกรุณาลองใหม่อีกครั้งครับ');
      }
    };

    run();
  }, []);

  const fetchMission = async (userId: string) => {
    // Clean URL from any LIFF parameters
    window.history.replaceState({}, '', '/driver/my-mission');

    try {
      const res = await fetch(`/api/driver/active-trip?lineUserId=${userId}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setError('ไม่พบข้อมูลคนขับในระบบ\nกรุณาลงทะเบียนก่อนใช้งานครับ');
        } else if (res.status === 403) {
          setError('บัญชียังไม่ได้รับการอนุมัติ\nกรุณารอแอดมินอนุมัติครับ');
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
      setError('เกิดปัญหาในการเชื่อมต่อเซิร์ฟเวอร์\nกรุณาลองใหม่อีกครั้งครับ');
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
          <button
            onClick={() => {
              initialized.current = false;
              setError(null);
              window.location.reload();
            }}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg"
          >
            ลองตรวจสอบอีกครั้ง
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-slate-600 font-medium animate-pulse">{statusMsg}</p>
        </div>
      )}
    </div>
  );
}
