'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Truck, MapPin, Leaf, PlusCircle, ExternalLink, Loader2, Search } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function ManageTripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ข้อมูลฟอร์มสร้างงานใหม่
  const [form, setForm] = useState({
    tripId: '',
    origin: '',
    destination: '',
    mapUrl: '', 
    carbon: '',
    companyName: ''
  });

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (sessionEmail) {
      fetchInitialData();
    }
  }, [sessionEmail]);

  // 1. ดึงข้อมูล Session
  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      if (session?.user?.email) {
        setSessionEmail(session.user.email);
      }
    } catch (error) {
      console.error("Session fetch error:", error);
    }
  };

  // 2. ดึงข้อมูล User และ Trips
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // ดึงข้อมูล User เพื่อเช็ก Role และบริษัท
      const userRes = await fetch('/api/admin/users');
      const users = await userRes.json();
      const me = users.find((u: any) => u.email === sessionEmail);
      setCurrentUser(me);

      // ดึงข้อมูล Trips
      const tripRes = await fetch('/api/admin/trips', { cache: 'no-store' });
      const allTrips = await tripRes.json();
      
      // กรองข้อมูลตามสิทธิ์
      if (me?.role === 'system_owner' || me?.role === 'operator' || me?.role === 'admin') {
        setTrips(allTrips); // แอดมินเห็นทั้งหมด
      } else {
        // ลูกค้าเห็นเฉพาะบริษัทตัวเอง
        setTrips(allTrips.filter((t: any) => t.companyName === me?.companyName));
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. ฟังก์ชันสร้างงานใหม่
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: form.tripId,
          origin: form.origin,
          destination: form.destination,
          mapUrl: form.mapUrl,
          carbon: Number(form.carbon),
          // ถ้าแอดมินสร้างให้ใส่ชื่อบริษัทที่ระบุ ถ้าลูกค้าสร้างให้ล็อกเป็นบริษัทตัวเอง
          companyName: currentUser?.role?.includes('admin') || currentUser?.role === 'system_owner' 
            ? form.companyName 
            : currentUser?.companyName
        }),
      });

      if (res.ok) {
        alert('เพิ่มงานขนส่งเรียบร้อยแล้ว!');
        setForm({ tripId: '', origin: '', destination: '', mapUrl: '', carbon: '', companyName: '' }); 
        fetchInitialData(); 
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      alert('ระบบขัดข้อง');
    }
  };

  return (
    <SidebarLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Truck className="text-blue-600" /> จัดการงานขนส่ง (Job Management)
        </h1>
        <p className="text-sm text-slate-500 mb-8">บันทึกข้อมูลการเดินรถ เส้นทาง พิกัด GPS และปริมาณคาร์บอนฟุตพรินต์</p>

        {/* 🟢 ส่วนที่ 1: ฟอร์มเพิ่มงาน (เฉพาะแอดมินหรือคนมีสิทธิ์) */}
        {['system_owner', 'operator', 'admin', 'corporate_admin'].includes(currentUser?.role) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-md font-bold text-slate-700 flex items-center gap-2 mb-5">
              <PlusCircle size={18} className="text-blue-500" /> รายละเอียดงานใหม่
            </h2>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">รหัสงาน (Trip ID)</label>
                  <input type="text" required placeholder="เช่น TRP-1001" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.tripId} onChange={e => setForm({...form, tripId: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ต้นทาง (Origin)</label>
                  <input type="text" required placeholder="จุดรับสินค้า" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ปลายทาง (Destination)</label>
                  <input type="text" required placeholder="จุดส่งสินค้า" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-blue-500 uppercase mb-1">พิกัดแผนที่ (Google Maps URL)</label>
                  <input type="url" placeholder="https://maps.google.com/..." className="w-full p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.mapUrl} onChange={e => setForm({...form, mapUrl: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-green-600 uppercase mb-1">คาร์บอน (kgCO2e)</label>
                  <input type="number" required placeholder="ปริมาณที่ปล่อย" className="w-full p-2.5 bg-green-50/30 border border-green-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" value={form.carbon} onChange={e => setForm({...form, carbon: e.target.value})} />
                </div>
                {/* ถ้าเป็นเจ้าของระบบ ให้เลือกบริษัทได้ */}
                {['system_owner', 'operator', 'admin'].includes(currentUser?.role) && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ชื่อบริษัทลูกค้า</label>
                    <input type="text" required placeholder="ระบุบริษัทเพื่อวางบิล" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl text-sm transition-all shadow-md shadow-blue-100">
                  สร้างงานขนส่ง
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 🟢 ส่วนที่ 2: ตารางแสดงรายการงาน */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold text-slate-700">ประวัติการเดินรถล่าสุด</h3>
             <div className="text-xs text-slate-400">พบทั้งหมด {trips.length} รายการ</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-tighter border-b border-slate-100">
                  <th className="p-4 font-bold">รหัสงาน</th>
                  <th className="p-4 font-bold">บริษัท</th>
                  <th className="p-4 font-bold">เส้นทาง / พิกัด</th>
                  <th className="p-4 font-bold">คาร์บอนสะสม</th>
                  <th className="p-4 font-bold">สถานะ POD</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-300 italic"><Loader2 className="animate-spin inline mr-2" /> กำลังซิงค์ข้อมูล...</td></tr>
                ) : trips.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-300 italic font-light">ยังไม่พบข้อมูลงานในระบบ</td></tr>
                ) : (
                  trips.map(trip => (
                    <tr key={trip._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-blue-600">{trip.tripId}</td>
                      <td className="p-4 text-slate-500 font-medium">{trip.companyName || '-'}</td>
                      <td className="p-4">
                        <div className="text-slate-700 font-medium">{trip.origin} ➔ {trip.destination}</div>
                        {trip.mapUrl && (
                          <a href={trip.mapUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-500 hover:underline flex items-center gap-1 mt-1">
                            <ExternalLink size={10} /> ดู Google Maps
                          </a>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-green-600 font-bold">
                          <Leaf size={14} /> {trip.carbon.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">kgCO2e</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          trip.status === 'Verified' ? 'bg-green-50 text-green-700 border-green-100' : 
                          trip.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                          'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                          {trip.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}