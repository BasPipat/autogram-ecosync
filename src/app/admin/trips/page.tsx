'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Truck, MapPin, Leaf, PlusCircle, ExternalLink, Loader2, MapPinned, X, Route, Package } from 'lucide-react';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const mapContainerStyle = { width: '100%', height: '400px', borderRadius: 'var(--radius-lg)' };
const defaultCenter = { lat: 13.7563, lng: 100.5018 }; 
const libraries: ("places")[] = ["places"]; 

export default function ManageTripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [form, setForm] = useState({
    tripId: '', origin: '', originMapUrl: '', destination: '', destinationMapUrl: '', 
    distance: '', weight: '', carbon: '', companyName: '' 
  });

  const [mapModal, setMapModal] = useState({ isOpen: false, target: '' });
  const [markerPos, setMarkerPos] = useState<{lat: number, lng: number} | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>('');
  
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    fetchInitialData();
  }, [status, session, router]);

  // 🟢 Effect: คำนวณระยะทางอัตโนมัติ
  useEffect(() => {
    if (form.originMapUrl && form.destinationMapUrl && (window as any).google) {
      calculateDistance();
    }
  }, [form.originMapUrl, form.destinationMapUrl]);

  // 🟢 Effect: คำนวณคาร์บอนอัตโนมัติ
  useEffect(() => {
    if (form.distance && form.weight) {
      const carbonVal = (Number(form.distance) * Number(form.weight) * 0.062).toFixed(2);
      setForm(prev => ({ ...prev, carbon: carbonVal }));
    }
  }, [form.distance, form.weight]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const userRes = await fetch('/api/admin/users');
      const users = await userRes.json();
      const me = users.find((u: any) => u.email === session?.user?.email);
      setCurrentUser(me);

      const tripRes = await fetch('/api/admin/trips', { cache: 'no-store' });
      const allTrips = await tripRes.json();
      
      if (me?.role === 'owner' || me?.role === 'operator' || me?.role === 'admin') {
        setTrips(allTrips);
      } else {
        setTrips(allTrips.filter((t: any) => t.companyName === me?.companyName));
      }
    } catch (e) {} finally { setLoading(false); }
  };

  const calculateDistance = () => {
    const originMatch = form.originMapUrl.match(/q=([\d.-]+),([\d.-]+)/);
    const destMatch = form.destinationMapUrl.match(/q=([\d.-]+),([\d.-]+)/);

    if (originMatch && destMatch) {
      const origin = new (window as any).google.maps.LatLng(parseFloat(originMatch[1]), parseFloat(originMatch[2]));
      const dest = new (window as any).google.maps.LatLng(parseFloat(destMatch[1]), parseFloat(destMatch[2]));

      const service = new (window as any).google.maps.DistanceMatrixService();
      service.getDistanceMatrix({
        origins: [origin],
        destinations: [dest],
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
      }, (response: any, status: string) => {
        if (status === 'OK' && response && response.rows[0].elements[0].status === 'OK') {
          const distKm = (response.rows[0].elements[0].distance.value / 1000).toFixed(2);
          setForm(prev => ({ ...prev, distance: distKm }));
        }
      });
    }
  };

  const openMapPicker = (target: 'origin' | 'destination') => {
    setMapModal({ isOpen: true, target });
    setMarkerPos(null); 
    setMapCenter(defaultCenter); 
    setSelectedPlaceName(''); 
  };

  // 🟢 Reverse Geocoding (สแกนหาชื่อสถานที่จากการจิ้มแผนที่)
  const handleMapClick = (e: any) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPos({ lat, lng });
    setSelectedPlaceName('กำลังดึงชื่อสถานที่...'); 

    if ((window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (status === 'OK' && results && results[0]) {
          let subdistrict = "";
          let province = "";
          for (const component of results[0].address_components) {
            if (component.types.includes("administrative_area_level_1")) province = component.long_name;
            if (component.types.includes("sublocality_level_1") || component.types.includes("sublocality") || component.types.includes("administrative_area_level_3")) subdistrict = component.long_name;
          }

          let locationDetails = [];
          if (subdistrict) locationDetails.push(subdistrict);
          if (province) locationDetails.push(province);

          let finalString = "";
          if (locationDetails.length > 0) {
             finalString = locationDetails.join(', ');
          } else {
             finalString = "พิกัดที่เลือกบนแผนที่";
          }
          setSelectedPlaceName(finalString);
        } else {
          setSelectedPlaceName('ไม่พบชื่อสถานที่');
        }
      });
    }
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMarkerPos({ lat, lng });
        setMapCenter({ lat, lng });

        let placeName = place.name || "";
        let subdistrict = "";
        let province = "";

        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes("administrative_area_level_1")) province = component.long_name;
            if (component.types.includes("sublocality_level_1") || component.types.includes("sublocality") || component.types.includes("administrative_area_level_3")) subdistrict = component.long_name;
          }
        }

        let locationDetails = [];
        if (subdistrict) locationDetails.push(subdistrict);
        if (province) locationDetails.push(province);

        let finalString = placeName;
        if (locationDetails.length > 0 && !placeName.includes(province)) {
           finalString = `${placeName} (${locationDetails.join(', ')})`;
        } else if (place.formatted_address && !placeName) {
           finalString = place.formatted_address;
        }

        setSelectedPlaceName(finalString);
      }
    }
  };

  const confirmLocation = () => {
    if (!markerPos) return;
    const mapUrl = `http://googleusercontent.com/maps.google.com/?q=${markerPos.lat},${markerPos.lng}`;
    
    if (mapModal.target === 'origin') {
      setForm({ ...form, originMapUrl: mapUrl, origin: selectedPlaceName ? selectedPlaceName : form.origin });
    } else {
      setForm({ ...form, destinationMapUrl: mapUrl, destination: selectedPlaceName ? selectedPlaceName : form.destination });
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
          distance: Number(form.distance), weight: Number(form.weight), carbon: Number(form.carbon),
          companyName: currentUser?.role?.includes('admin') || currentUser?.role === 'owner' ? form.companyName : currentUser?.companyName
        }),
      });

      if (res.ok) {
        alert('เพิ่มงานขนส่งเรียบร้อยแล้ว!');
        setForm({ tripId: '', origin: '', originMapUrl: '', destination: '', destinationMapUrl: '', distance: '', weight: '', carbon: '', companyName: '' }); 
        fetchInitialData(); 
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) { alert('ระบบขัดข้อง'); }
  };

  return (
    <SidebarLayout>
      {/* 🟢 เติมคำสั่ง language="th" และ region="TH" ตรงนี้ครับ */}
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries} language="th" region="TH">
        <div className="p-6" style={{ background: 'var(--bg-base)' }}>
          <div className="flex items-center gap-3 mb-6 animate-fade-in">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
              <Truck size={20} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>จัดการงานขนส่ง (Job Management)</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>บันทึกเส้นทาง คำนวณระยะทางอัตโนมัติ และประเมินการปล่อยคาร์บอน (kgCO2e)</p>
            </div>
          </div>

          {['owner', 'operator', 'admin', 'corp_admin'].includes(currentUser?.role || '') && (
            <div className="card p-6 mb-6">
              <h2 className="text-md font-bold text-slate-700 flex items-center gap-2 mb-5">
                <PlusCircle size={18} className="text-blue-500" /> รายละเอียดงานใหม่
              </h2>
              
              <form onSubmit={handleCreateTrip} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                    <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                      <MapPin size={16} className="text-orange-500"/> ข้อมูลต้นทาง (Origin)
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ชื่อสถานที่จุดรับสินค้า</label>
                      <input type="text" required placeholder="เช่น ท่าเรือแหลมฉบัง" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-500 uppercase mb-1">พิกัดแผนที่</label>
                      <div className="flex gap-2">
                        <input type="url" readOnly placeholder="คลิกปุ่มเปิดแผนที่..." className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 outline-none" value={form.originMapUrl} />
                        <button type="button" onClick={() => openMapPicker('origin')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 flex items-center justify-center rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm shadow-blue-200">
                          <MapPinned size={14} className="mr-1" /> เปิดแผนที่
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                    <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                      <MapPin size={16} className="text-green-500"/> ข้อมูลปลายทาง (Destination)
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ชื่อสถานที่จุดส่งสินค้า</label>
                      <input type="text" required placeholder="เช่น คลังสินค้าวังน้อย" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-green-600 uppercase mb-1">พิกัดแผนที่</label>
                      <div className="flex gap-2">
                        <input type="url" readOnly placeholder="คลิกปุ่มเปิดแผนที่..." className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 outline-none" value={form.destinationMapUrl} />
                        <button type="button" onClick={() => openMapPicker('destination')} className="bg-green-600 hover:bg-green-700 text-white px-4 flex items-center justify-center rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm shadow-green-200">
                          <MapPinned size={14} className="mr-1" /> เปิดแผนที่
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <h4 className="font-bold text-sm text-blue-800 flex items-center gap-2 mb-4">
                    <Leaf size={16} /> ข้อมูลการวิ่ง & คำนวณคาร์บอน (Auto-Calculate)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">รหัสงาน (Trip ID)</label>
                      <input type="text" required placeholder="TRP-..." className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.tripId} onChange={e => setForm({...form, tripId: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Route size={12}/> ระยะทาง (กิโลเมตร)</label>
                      <input type="number" step="0.01" required placeholder="คำนวณอัตโนมัติ" className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700" value={form.distance} onChange={e => setForm({...form, distance: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-orange-600 uppercase mb-1 flex items-center gap-1"><Package size={12}/> น้ำหนักบรรทุก (ตัน)</label>
                      <input type="number" step="0.01" required placeholder="ระบุน้ำหนัก" className="w-full p-2.5 bg-white border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold text-orange-700" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-green-600 uppercase mb-1 flex items-center gap-1"><Leaf size={12}/> คาร์บอน (kgCO2e)</label>
                      <input type="number" step="0.01" required placeholder="ผลลัพธ์..." className="w-full p-2.5 bg-green-100 border border-green-300 rounded-lg text-sm outline-none font-bold text-green-800" value={form.carbon} onChange={e => setForm({...form, carbon: e.target.value})} />
                    </div>
                  </div>
                  
                  {['owner', 'operator', 'admin'].includes(currentUser?.role || '') && (
                    <div className="mt-4">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ชื่อบริษัทลูกค้า (สำหรับวางบิล)</label>
                      <input type="text" required placeholder="ระบุบริษัท" className="w-full md:w-1/4 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className="font-bold py-3 px-10 rounded-xl text-sm transition-all" style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                    + สร้างงานขนส่ง
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-light)' }}>
               <h3 className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>ประวัติการเดินรถล่าสุด</h3>
               <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--border-light)', color: 'var(--text-tertiary)' }}>พบทั้งหมด {trips.length} รายการ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4 font-bold">รหัสงาน</th>
                    <th className="p-4 font-bold">บริษัท</th>
                    <th className="p-4 font-bold w-1/3">เส้นทาง</th>
                    <th className="p-4 font-bold text-center">ระยะทาง / น้ำหนัก</th>
                    <th className="p-4 font-bold">คาร์บอน</th>
                    <th className="p-4 font-bold">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-300 italic"><Loader2 className="animate-spin inline mr-2" /> กำลังซิงค์ข้อมูล...</td></tr>
                  ) : trips.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-300 italic font-light">ยังไม่พบข้อมูลงานในระบบ</td></tr>
                  ) : (
                    trips.map(trip => (
                      <tr key={trip._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-blue-600">{trip.tripId}</td>
                        <td className="p-4 text-slate-500 font-medium text-xs">{trip.companyName || '-'}</td>
                        
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></span> 
                              <span className="truncate max-w-xs">{trip.origin}</span>
                              {trip.originMapUrl && <a href={trip.originMapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500"><ExternalLink size={10}/></a>}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span> 
                              <span className="truncate max-w-xs">{trip.destination}</span>
                              {trip.destinationMapUrl && <a href={trip.destinationMapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500"><ExternalLink size={10}/></a>}
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{trip.distance || 0} km</span>
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{trip.weight || 0} tons</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1 text-green-600 font-bold">
                            <Leaf size={14} /> {trip.carbon?.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">kgCO2e</span>
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

        {mapModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <MapPinned className={mapModal.target === 'origin' ? 'text-orange-500' : 'text-green-500'} /> 
                  {mapModal.target === 'origin' ? 'ค้นหาและปักหมุดจุดรับสินค้า (Origin)' : 'ค้นหาและปักหมุดจุดส่งสินค้า (Destination)'}
                </h3>
                <button onClick={() => setMapModal({ isOpen: false, target: '' })} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
              </div>
              
              <div className="p-4 bg-slate-100 flex flex-col gap-3">
                <Autocomplete onLoad={(auto) => autocompleteRef.current = auto} onPlaceChanged={onPlaceChanged}>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400"><MapPin size={18} /></span>
                    <input type="text" placeholder="พิมพ์ชื่อสถานที่ที่ต้องการค้นหา..." className="w-full pl-10 p-3 border border-slate-300 rounded-lg shadow-sm text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700" />
                  </div>
                </Autocomplete>

                <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden shadow-inner">
                  <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={markerPos ? 16 : 10} onClick={handleMapClick}>
                    {markerPos && <Marker position={markerPos} />}
                  </GoogleMap>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
                <div className="text-xs text-slate-500 flex flex-col">
                  {selectedPlaceName ? <span className="text-green-600 font-bold text-[12px] max-w-lg truncate">📍 ค้นพบ: {selectedPlaceName}</span> : markerPos ? <span className="text-blue-500 font-bold">📍 เลือกพิกัดแล้ว</span> : <span>คลิกบนแผนที่เพื่อปักหมุด</span>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMapModal({ isOpen: false, target: '' })} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">ยกเลิก</button>
                  <button onClick={confirmLocation} disabled={!markerPos} className={`px-8 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${markerPos ? (mapModal.target === 'origin' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700') : 'bg-slate-300 cursor-not-allowed'}`}>ยืนยันพิกัดและสถานที่</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </LoadScript>
    </SidebarLayout>
  );
}