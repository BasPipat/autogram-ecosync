'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';
import { Loader2 } from 'lucide-react';

export default function MyMissionRedirect() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiffAndRedirect = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
        if (!liffId) {
          setError('LIFF ID is not configured in .env.local');
          return;
        }

        // 1. Initialize LIFF
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        // 2. Get Driver Profile from LINE
        const profile = await liff.getProfile();
        const lineUserId = profile.userId;

        // 3. Fetch status and active trip from API
        const statusRes = await fetch(`/api/driver/status?lineUserId=${lineUserId}`);
        const statusData = await statusRes.json();

        if (!statusData.isRegistered || statusData.status !== 'approved') {
          alert('กรุณาลงทะเบียนหรือรอการตรวจสอบเอกสารก่อนเริ่มใช้งานครับ');
          router.replace('/driver/register');
          return;
        }

        const res = await fetch(`/api/driver/active-trip?lineUserId=${lineUserId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch trip data');

        // 4. Smart Redirect Logic
        if (data.activeTripId) {
           // If has active mission, go to trip details
           router.replace(`/driver/trips/${data.activeTripId}`);
        } else {
           // If no active mission, go to job board with alert
           alert('คุณยังไม่มีงานที่กำลังดำเนินการ ลองหาภารกิจใหม่ดูสิ!');
           router.replace(`/driver/jobs?lineUserId=${lineUserId}`);
        }

      } catch (err: any) {
        console.error('LIFF Init Error:', err);
        setError('ไม่สามารถเชื่อมต่อระบบ LINE ได้ กรุณาลองใหม่อีกครั้ง');
      }
    };

    initLiffAndRedirect();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      {error ? (
        <div className="text-red-500 font-medium px-6 text-center">{error}</div>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">กำลังค้นหาภารกิจของคุณ...</p>
        </div>
      )}
    </div>
  );
}
