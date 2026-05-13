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
        const queryParams = new URLSearchParams(window.location.search);
        let finalLineUserId = queryParams.get('lineUserId') || '';

        // 1. Try Initialize LIFF if available
        const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
        if (liffId && !finalLineUserId) {
          try {
            await liff.init({ liffId });
            if (liff.isLoggedIn()) {
              const profile = await liff.getProfile();
              finalLineUserId = profile.userId;
            } else {
              liff.login();
              return;
            }
          } catch (err) {
            console.error('LIFF Init failed, falling back to query params:', err);
          }
        }

        if (!finalLineUserId) {
          setError('ไม่พบข้อมูลผู้ใช้งาน LINE กรุณาเข้าใช้งานผ่านปุ่มใน LINE OA ครับ');
          return;
        }

        // 2. Fetch status and active trip from API
        const statusRes = await fetch(`/api/driver/status?lineUserId=${finalLineUserId}`);
        const statusData = await statusRes.json();

        if (!statusData.isRegistered || statusData.status !== 'approved') {
          alert('กรุณาลงทะเบียนหรือรอการตรวจสอบเอกสารก่อนเริ่มใช้งานครับ');
          router.replace('/driver/register');
          return;
        }

        const res = await fetch(`/api/driver/active-trip?lineUserId=${finalLineUserId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to fetch trip data');

        // 3. Smart Redirect Logic
        if (data.activeTripId) {
           router.replace(`/trips/${data.activeTripId}?lineUserId=${finalLineUserId}`);
        } else {
           alert('คุณยังไม่มีงานที่กำลังดำเนินการ ลองหาภารกิจใหม่ดูสิ!');
           router.replace(`/driver/jobs?lineUserId=${finalLineUserId}`);
        }

      } catch (err: any) {
        console.error('Redirect Error:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
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
