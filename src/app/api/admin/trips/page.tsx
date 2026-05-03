'use client';
import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Truck, MapPin, Leaf, PlusCircle, ExternalLink } from 'lucide-react';

export default function ManageTripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🟢 เพิ่ม mapUrl เข้าไปใน State ของฟอร์ม
  const [form, setForm] = useState({
    tripId: '',
    origin: '',
    destination: '',
    mapUrl: '', 
    carbon: '',
    companyName: ''
  });

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/trips', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
      }
    } catch (error) {} finally { setLoading(false); }
  };

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
          mapUrl: form.mapUrl, // 🟢 ส่งพิกัดแผนที่ไปหลังบ้าน
          carbon: Number(form.carbon),
          companyName: form.companyName
        }),
      });

      if (res.ok) {
        alert('เพิ่มงานขนส่งเรียบร้อยแล้ว!');
        setForm({ tripId: '', origin: '', destination: '', mapUrl: '', carbon: '', companyName: '' }); 
        fetchTrips(); 
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
        <h1 className="text-2xl font-bold text-slate-800 mb-2">🚚 จัดการงานขนส่ง (Job Management)</h1>
        <p className="text-sm text-slate-500 mb-6">เพิ่มรายการเดินรถใหม่ กำหนดพิกัดแผนที่ และคำนวณคาร์บอนฟุตพรินต์</p>

        {/* 🟢 ฟอร์มเพิ่มงาน (ปรับให้เป็น 3 คอลัมน์ 2 แถว เพื่อให้เรียงสวยงาม) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-lg font-bold text-blue-700 flex items-center gap-2 mb-4">
            <PlusCircle size={20} /> เปิดงานใหม่ (Create Job)
          </h2>
          <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">รหัสงาน (Trip ID)</label>
              <input type="text" required placeholder="เช่น TRP-001" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.tripId} onChange={e => setForm({...form, tripId: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ต้นทาง (Origin)</label>
              <input type="text" required placeholder="เช่น ศูนย์กระจายสินค้า A" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ปลายทาง (Destination)</label>
              <input type="text" required placeholder="เช่น สาขาเชียงใหม่" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
            </div>
            
            {/* 🟢 ช่องกรอกพิกัดโลเคชั่น */}
            <div>
              <label className="block text-xs font-semibold text-blue-600 mb-1">พิกัดแผนที่ (Location URL)</label>
              <input type="url" placeholder="วางลิงก์ Google Maps ที่นี่..." className="w-full p-2 border border-blue-200 bg-blue-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.mapUrl} onChange={e => setForm({...form, mapUrl: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">คาร์บอน (kgCO2e)</label>
              <input type="number" required placeholder="เช่น 150" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.carbon} onChange={e => setForm({...form, carbon: e.target.value})} />
            </div>
            <div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                บันทึกงาน
              </button>
            </div>
          </form>
        </div>

        {/* 🟢 ตารางแสดงงาน */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200 uppercase tracking-widest">
                <th className="p-4 font-bold">รหัสงาน</th>
                <th className="p-4 font-bold">เส้นทาง & พิกัด</th>
                <th className="p-4 font-bold">คาร์บอนที่ปล่อย</th>
                <th className="p-4 font-bold">สถานะหลักฐาน</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">กำลังโหลด...</td></tr>
              ) : trips.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">ยังไม่มีงานในระบบ</td></tr>
              ) : (
                trips.map(trip => (
                  <tr key={trip._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-700">{trip.tripId}</td>
                    
                    <td className="p-4 text-slate-600 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" /> {trip.origin} <span className="text-slate-300">➔</span> {trip.destination}
                      </div>
                      {/* 🟢 แสดงปุ่มกดเปิดแผนที่ ถ้ามีการกรอกพิกัดไว้ */}
                      {trip.mapUrl && (
                        <a href={trip.mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-5 mt-1 font-medium w-fit bg-blue-50 px-2 py-0.5 rounded">
                          <ExternalLink size={12} /> เปิดดูพิกัดแผนที่ (Google Maps)
                        </a>
                      )}
                    </td>

                    <td className="p-4 text-green-600 font-medium">
                      <div className="flex items-center gap-1"><Leaf size={14} /> {trip.carbon} kg</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${trip.status === 'Verified' ? 'bg-green-100 text-green-700' : trip.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
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
    </SidebarLayout>
  );
}