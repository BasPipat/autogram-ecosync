'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { Truck, MapPin, Leaf, PlusCircle, ExternalLink, Loader2, MapPinned, X } from 'lucide-react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyCJBdRCt3l2Lp8KdPPMb4TlLjIFdS2R-_E"; // 🟢 API Key ของบอส

const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '0.5rem' };
const defaultCenter = { lat: 13.7563, lng: 100.5018 }; // เริ่มต้นที่กรุงเทพฯ

export default function ManageTripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [form, setForm] = useState({
    tripId: '', origin: '', originMapUrl: '', destination: '', destinationMapUrl: '', carbon: '', companyName: ''
  });

  // 🟢 State สำหรับจัดการ Popup แผนที่
  const [mapModal, setMapModal] = useState({ isOpen: false, target: '' });
  const [markerPos, setMarkerPos] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => { fetchSession(); }, []);
  useEffect(() => { if (sessionEmail) fetchInitialData(); }, [sessionEmail]);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      if (session?.user?.email) setSessionEmail(session.user.email);
    } catch (e) {}
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const userRes = await fetch('/api/admin/users');
      const users = await userRes.json();
      const me = users.find((u: any) => u.email === sessionEmail);
      setCurrentUser(me);

      const tripRes = await fetch('/api/admin/trips', { cache: 'no-store' });
      const allTrips = await tripRes.json();
      
      if (me?.role === 'system_owner' || me?.role === 'operator' || me?.role === 'admin') {
        setTrips(allTrips);
      } else {
        setTrips(allTrips.filter((t: any) => t.companyName === me?.companyName));
      }
    } catch (e) {} finally { setLoading(false); }
  };

  // 🟢 เปิด Popup แผนที่
  const openMapPicker = (target: 'origin' | 'destination') => {
    setMapModal({ isOpen: true, target });
    setMarkerPos(null); // เคลียร์หมุดเก่า
  };

  // 🟢 กดคลิกบนแผนที่เพื่อปักหมุด
  const handleMapClick = (e: any) => {
    setMarkerPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  // 🟢 กดยืนยันพิกัดที่ปักหมุด
  const confirmLocation = () => {
    if (!markerPos) return;
    const mapUrl = `https://www.google.com/maps?q=${markerPos.lat},${markerPos.lng}`;
    
    if (mapModal.target === 'origin') {
      setForm({ ...form, originMapUrl: mapUrl });
    } else {
      setForm({ ...form, destinationMapUrl: mapUrl });
    }
    setMapModal({ isOpen: false, target: '' });
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: form.tripId, origin: form.origin, originMapUrl: form.originMapUrl,
          destination: form.destination, destinationMapUrl: form.destinationMapUrl,
          carbon: Number(form.carbon),
          companyName: currentUser?.role?.includes('admin') || currentUser?.role === 'system_owner' ? form.companyName : currentUser?.companyName
        }),
      });

      if (res.ok) {
        alert('เพิ่มงานขนส่งเรียบร้อยแล้ว!');
        setForm({ tripId: '', origin: '', originMapUrl: '', destination: '', destinationMapUrl: '', carbon: '', companyName: '' }); 
        fetchInitialData(); 
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) { alert('ระบบขัดข้อง'); }
  };

  return (
    <SidebarLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Truck className="text-blue-600" /> จัดการงานขนส่ง (Job Management)
        </h1>
        <p className="text-sm text-slate-500 mb-8">บันทึกข้อมูลการเดินรถ เส้นทาง พิกัด GPS และปริมาณคาร์บอนฟุตพรินต์</p>

        {['system_owner', 'operator', 'admin', 'corporate_admin'].includes(currentUser?.role) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
            <h2 className="text-md font-bold text-slate-700 flex items-center gap-2 mb-5">
              <PlusCircle size={18} className="text-blue-500" /> รายละเอียดงานใหม่
            </h2>
            
            <form onSubmit={handleCreateTrip} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 📍 กล่องต้นทาง */}
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                  <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                    <MapPin size={16} className="text-orange-500"/> ข้อมูลต้นทาง (Origin)
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ชื่อสถานที่จุดรับสินค้า</label>
                    <input type="text" required placeholder="เช่น ท่าเรือแหลมฉบัง" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-500 uppercase mb-1">พิกัดแผนที่ (คลิกปุ่มเพื่อปักหมุด)</label>
                    <div className="flex gap-2">
                      <input type="url" readOnly placeholder="พิกัดจะแสดงที่นี่..." className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 outline-none" value={form.originMapUrl} />
                      <button type="button" onClick={() => openMapPicker('origin')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 flex items-center justify-center rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm shadow-blue-200">
                        <MapPinned size={14} className="mr-1" /> เปิดแผนที่
                      </button>
                    </div>
                  </div>
                </div>

                {/* 📍 กล่องปลายทาง */}
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                  <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                    <MapPin size={16} className="text-green-500"/> ข้อมูลปลายทาง (Destination)
                  </h4>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ชื่อสถานที่จุดส่งสินค้า</label>
                    <input type="text" required placeholder="เช่น คลังสินค้าวังน้อย" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-green-600 uppercase mb-1">พิกัดแผนที่ (คลิกปุ่มเพื่อปักหมุด)</label>
                    <div className="flex gap-2">
                      <input type="url" readOnly placeholder="พิกัดจะแสดงที่นี่..." className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 outline-none" value={form.destinationMapUrl} />
                      <button type="button" onClick={() => openMapPicker('destination')} className="bg-green-600 hover:bg-green-700 text-white px-4 flex items-center justify-center rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm shadow-green-200">
                        <MapPinned size={14} className="mr-1" /> เปิดแผนที่
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">รหัสงาน (Trip ID)</label>
                  <input type="text" required placeholder="เช่น TRP-1001" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500" value={form.tripId} onChange={e => setForm({...form, tripId: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-green-600 uppercase mb-1">คาร์บอนที่ปล่อย (kgCO2e)</label>
                  <input type="number" required placeholder="ตัวเลขปริมาณคาร์บอน" className="w-full p-2.5 bg-green-50/30 border border-green-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" value={form.carbon} onChange={e => setForm({...form, carbon: e.target.value})} />
                </div>
                {['system_owner', 'operator', 'admin'].includes(currentUser?.role) && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ชื่อบริษัทลูกค้า (สำหรับวางบิล)</label>
                    <input type="text" required placeholder="ระบุบริษัท" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-500" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl text-sm transition-all shadow-md shadow-blue-100">
                  + สร้างงานขนส่ง
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 🟢 ตารางแสดงรายการงาน (เหมือนเดิม) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-bold text-slate-700">ประวัติการเดินรถล่าสุด</h3>
             <div className="text-xs text-slate-400">พบทั้งหมด {trips.length} รายการ</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4 font-bold">รหัสงาน</th>
                  <th className="p-4 font-bold">บริษัท</th>
                  <th className="p-4 font-bold w-2/5">เส้นทาง & พิกัด</th>
                  <th className="p-4 font-bold">คาร์บอน</th>
                  <th className="p-4 font-bold">สถานะ</th>
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
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                            <span className="w-2 h-2 rounded-full bg-orange-400"></span> {trip.origin} 
                            {trip.originMapUrl && <a href={trip.originMapUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100"><ExternalLink size={10} className="inline"/></a>}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> {trip.destination}
                            {trip.destinationMapUrl && <a href={trip.destinationMapUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100"><ExternalLink size={10} className="inline"/></a>}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-green-600 font-bold">
                          <Leaf size={14} /> {trip.carbon.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">kgCO2e</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${trip.status === 'Verified' ? 'bg-green-50 text-green-700 border-green-100' : trip.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
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

      {/* 🗺️ Popup แผนที่ Google Maps */}
      {mapModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPinned className={mapModal.target === 'origin' ? 'text-orange-500' : 'text-green-500'} /> 
                {mapModal.target === 'origin' ? 'ปักหมุดจุดรับสินค้า (Origin)' : 'ปักหมุดจุดส่งสินค้า (Destination)'}
              </h3>
              <button onClick={() => setMapModal({ isOpen: false, target: '' })} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-slate-100">
              <p className="text-xs text-slate-500 mb-2 font-medium">👉 คลิกบนแผนที่เพื่อเลือกตำแหน่งที่ต้องการ</p>
              <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={defaultCenter}
                  zoom={12}
                  onClick={handleMapClick}
                >
                  {markerPos && <Marker position={markerPos} />}
                </GoogleMap>
              </LoadScript>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button onClick={() => setMapModal({ isOpen: false, target: '' })} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                ยกเลิก
              </button>
              <button onClick={confirmLocation} disabled={!markerPos} className={`px-8 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${markerPos ? (mapModal.target === 'origin' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700') : 'bg-slate-300 cursor-not-allowed'}`}>
                ยืนยันพิกัดนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}