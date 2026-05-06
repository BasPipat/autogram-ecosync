'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Truck, MapPin, Leaf, PlusCircle, ExternalLink, MapPinned, X, Route, Package } from 'lucide-react';
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
  const [historicalLocations, setHistoricalLocations] = useState<string[]>([]);
  const [masterLocations, setMasterLocations] = useState<any[]>([]);
  const [masterCustomers, setMasterCustomers] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'pending'>('all');

  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const initialFormState = {
    tripId: '',
    origin: '', originMapUrl: '',
    scheduledOriginDate: getTomorrowString(), scheduledOriginTime: '', originContactName: '', originContactPhone: '',
    destination: '', destinationMapUrl: '',
    scheduledDestinationDate: getTomorrowString(), scheduledDestinationTime: '', destinationContactName: '', destinationContactPhone: '',
    distance: '', weight: '', carbon: '', companyName: '', customerName: '',
    vehicleCount: 1,
  };

  const [form, setForm] = useState(initialFormState);

  const [mapModal, setMapModal] = useState({ isOpen: false, target: '' });
  const [markerPos, setMarkerPos] = useState<{ lat: number, lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>('');

  const autocompleteRef = useRef<any>(null);

  const fetchInitialData = async (currentSession?: any) => {
    setLoading(true);
    try {
      const activeSession = currentSession || session;
      if (!activeSession?.user?.email) return;

      const userRes = await fetch('/api/admin/users', { cache: 'no-store' });
      const users = await userRes.json();
      const me = users.find((u: any) => u.email === activeSession.user.email);
      setCurrentUser(me);

      const tripRes = await fetch('/api/admin/trips', { cache: 'no-store' });
      const allTrips = await tripRes.json();
      const locationRes = await fetch('/api/master-settings/locations', { cache: 'no-store' });
      const locationData = await locationRes.json();
      const masterItems = Array.isArray(locationData.locations) ? locationData.locations : [];
      setMasterLocations(masterItems);

      const customerRes = await fetch('/api/master-settings/customers', { cache: 'no-store' });
      const customerData = await customerRes.json();
      setMasterCustomers(Array.isArray(customerData.customers) ? customerData.customers : []);

      setTrips(allTrips);

      // Extract unique locations for Auto-fill
      const uniqueLocations = Array.from(new Set([
        ...masterItems.map((item: any) => item.name),
        ...allTrips.map((t: any) => t.origin),
        ...allTrips.map((t: any) => t.destination)
      ])).filter(Boolean) as string[];
      setHistoricalLocations(uniqueLocations);

    } catch (e) {
      console.error('Error fetching trips:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !session) {
      router.push('/');
      return;
    }

    fetchInitialData(session);
  }, [status, session, router]);

  // 🟢 Effect: คำนวณระยะทางอัตโนมัติ
  useEffect(() => {
    if (form.originMapUrl && form.destinationMapUrl && (window as any).google) {
      calculateDistance();
    }
  }, [form.originMapUrl, form.destinationMapUrl]);

  // 🟢 Effect: คำนวณคาร์บอนอัตโนมัติ (รวมจำนวนรถ)
  useEffect(() => {
    if (form.distance && form.weight) {
      const carbonVal = (Number(form.distance) * Number(form.weight) * 0.062 * Number(form.vehicleCount)).toFixed(2);
      setForm(prev => ({ ...prev, carbon: carbonVal }));
    }
  }, [form.distance, form.weight, form.vehicleCount]);

  const handleLocationChange = (type: 'origin' | 'destination', value: string) => {
    setForm(prev => ({ ...prev, [type]: value }));

    // Auto-fill logic
    const locationMatch = masterLocations.find((loc: any) => loc.name === value);
    if (locationMatch) {
      if (type === 'origin') {
        setForm(prev => ({
          ...prev,
          originMapUrl: locationMatch.locationLink || prev.originMapUrl,
          originContactName: locationMatch.contactPerson || prev.originContactName,
          originContactPhone: locationMatch.phoneNumber || prev.originContactPhone,
        }));
      } else {
        setForm(prev => ({
          ...prev,
          destinationMapUrl: locationMatch.locationLink || prev.destinationMapUrl,
          destinationContactName: locationMatch.contactPerson || prev.destinationContactName,
          destinationContactPhone: locationMatch.phoneNumber || prev.destinationContactPhone,
        }));
      }
      return;
    }

    const match = trips.find(t =>
      type === 'origin' ? t.origin === value : t.destination === value
    );

    if (match) {
      if (type === 'origin') {
        setForm(prev => ({
          ...prev,
          originMapUrl: match.originMapUrl || prev.originMapUrl,
          originContactName: match.originContactName || prev.originContactName,
          originContactPhone: match.originContactPhone || prev.originContactPhone,
          scheduledOriginTime: match.scheduledOriginTime || prev.scheduledOriginTime,
        }));
      } else {
        setForm(prev => ({
          ...prev,
          destinationMapUrl: match.destinationMapUrl || prev.destinationMapUrl,
          destinationContactName: match.destinationContactName || prev.destinationContactName,
          destinationContactPhone: match.destinationContactPhone || prev.destinationContactPhone,
          scheduledDestinationTime: match.scheduledDestinationTime || prev.scheduledDestinationTime,
        }));
      }
    }
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

          let finalString = locationDetails.length > 0 ? locationDetails.join(', ') : "พิกัดที่เลือกบนแผนที่";
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
          tripId: form.tripId,
          origin: form.origin, originMapUrl: form.originMapUrl,
          scheduledOriginDate: form.scheduledOriginDate,
          scheduledOriginTime: form.scheduledOriginTime,
          originContactName: form.originContactName,
          originContactPhone: form.originContactPhone,

          destination: form.destination, destinationMapUrl: form.destinationMapUrl,
          scheduledDestinationDate: form.scheduledDestinationDate,
          scheduledDestinationTime: form.scheduledDestinationTime,
          destinationContactName: form.destinationContactName,
          destinationContactPhone: form.destinationContactPhone,

          vehicleCount: form.vehicleCount,
          distance: Number(form.distance), weight: Number(form.weight), carbon: Number(form.carbon),
          companyName: currentUser?.role === 'owner' ? form.companyName : currentUser?.companyName,
          customerName: form.customerName
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert('เพิ่มงานขนส่งเรียบร้อยแล้ว!');
        setForm(initialFormState);
        setTrips(prev => [data.trip, ...prev]);
        fetchInitialData();
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) { alert('ระบบขัดข้อง'); }
  };

  const displayedTrips = filterTab === 'pending' ? trips.filter(t => !t.licensePlate && !t.driverName) : trips;

  const renderTableContent = () => (
    <div className="card overflow-hidden mb-6">
      <div className="px-6 py-4 flex justify-between items-center bg-white" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex gap-4">
          <button onClick={() => setFilterTab('all')} className={`text-sm font-bold pb-4 -mb-4 transition-colors ${filterTab === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>ประวัติทั้งหมด</button>
          <button onClick={() => setFilterTab('pending')} className={`text-sm font-bold pb-4 -mb-4 transition-colors ${filterTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>รอจัดสรร</button>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--border-light)', color: 'var(--text-tertiary)' }}>พบ {displayedTrips.length} รายการ</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
              <th className="p-4 font-bold">รหัสงาน</th>
              <th className="p-4 font-bold">ลูกค้า / บริษัท</th>
              <th className="p-4 font-bold w-1/3">เส้นทาง</th>
              <th className="p-4 font-bold text-center">รถ / ระยะ / น้ำหนัก</th>
              <th className="p-4 font-bold">คาร์บอน</th>
              <th className="p-4 font-bold">ทะเบียนรถ/คนขับ</th>
              <th className="p-4 font-bold">สถานะ</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="p-4"><div className="h-4 bg-slate-200 animate-pulse rounded w-16"></div></td>
                  <td className="p-4"><div className="h-4 bg-slate-200 animate-pulse rounded w-24"></div></td>
                  <td className="p-4"><div className="h-8 bg-slate-200 animate-pulse rounded w-full"></div></td>
                  <td className="p-4"><div className="h-8 bg-slate-200 animate-pulse rounded w-20 mx-auto"></div></td>
                  <td className="p-4"><div className="h-4 bg-slate-200 animate-pulse rounded w-16"></div></td>
                  <td className="p-4"><div className="h-4 bg-slate-200 animate-pulse rounded w-20"></div></td>
                  <td className="p-4"><div className="h-6 bg-slate-200 animate-pulse rounded-full w-16"></div></td>
                </tr>
              ))
            ) : displayedTrips.length === 0 ? (
              <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic font-medium">ยังไม่พบข้อมูลงานในระบบ</td></tr>
            ) : (
              displayedTrips.map(trip => (
                <tr key={trip._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-600">{trip.tripId}</td>
                  <td className="p-4 text-slate-500 font-medium text-xs">
                    <div>{trip.customerName ? <span className="font-bold text-emerald-700">{trip.customerName}</span> : '-'}</div>
                    {(currentUser?.role === 'system_owner' || currentUser?.role === 'owner') && <div className="text-[10px] text-slate-400 mt-1">{trip.companyName}</div>}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></span>
                        <span className="truncate max-w-xs">{trip.origin}</span>
                        {trip.originMapUrl && <a href={trip.originMapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500"><ExternalLink size={10} /></a>}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                        <span className="truncate max-w-xs">{trip.destination}</span>
                        {trip.destinationMapUrl && <a href={trip.destinationMapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500"><ExternalLink size={10} /></a>}
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{trip.vehicleCount || 1} คัน</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{trip.distance || 0} km</span>
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{trip.weight || 0} tons</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-1 text-green-600 font-bold">
                      <Leaf size={14} /> {trip.carbon?.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">kgCO2e</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {(!trip.licensePlate && !trip.driverName) ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-[10px] font-bold">รอพนักงานรับงาน</span>
                    ) : (
                      <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-700">
                        <span>{trip.licensePlate || '-'}</span>
                        <span className="text-slate-500 font-medium">{trip.driverName || '-'}</span>
                      </div>
                    )}
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
  );

  return (
    <SidebarLayout>
      <datalist id="historical-locations">
        {historicalLocations.map(loc => <option key={loc} value={loc} />)}
      </datalist>

      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries} language="th" region="TH">
        <div className="p-6" style={{ background: 'var(--bg-base)' }}>
          <div className="flex items-center gap-3 mb-6 animate-fade-in">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
              <Truck size={20} style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>จัดการงานขนส่ง (Job Management)</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>บันทึกเส้นทาง จัดการนัดหมาย และประเมินการปล่อยคาร์บอน (kgCO2e)</p>
            </div>
          </div>

          {['system_owner', 'owner', 'admin', 'operator', 'corp_admin'].includes(currentUser?.role || '') && (
            <div className="card p-6 mb-6">
              <h2 className="text-md font-bold text-slate-700 flex items-center gap-2 mb-5">
                <PlusCircle size={18} className="text-blue-500" /> รายละเอียดงานใหม่
              </h2>

              <form onSubmit={handleCreateTrip} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Origin */}
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                    <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                      <MapPin size={16} className="text-orange-500" /> ข้อมูลต้นทาง (Origin)
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ชื่อสถานที่จุดรับสินค้า</label>
                      <input list="historical-locations" type="text" required placeholder="เช่น ท่าเรือแหลมฉบัง" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.origin} onChange={e => handleLocationChange('origin', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">วันที่เข้ารับ</label>
                        <input type="date" required className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" value={form.scheduledOriginDate} onChange={e => setForm({ ...form, scheduledOriginDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">เวลา</label>
                        <input type="time" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" value={form.scheduledOriginTime} onChange={e => setForm({ ...form, scheduledOriginTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ชื่อผู้ติดต่อ</label>
                        <input type="text" placeholder="ชื่อผู้รับ" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" value={form.originContactName} onChange={e => setForm({ ...form, originContactName: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">เบอร์โทรศัพท์</label>
                        <input type="tel" placeholder="08x-xxx-xxxx" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" value={form.originContactPhone} onChange={e => setForm({ ...form, originContactPhone: e.target.value })} />
                      </div>
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

                  {/* Destination */}
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                    <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                      <MapPin size={16} className="text-green-500" /> ข้อมูลปลายทาง (Destination)
                    </h4>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ชื่อสถานที่จุดส่งสินค้า</label>
                      <input list="historical-locations" type="text" required placeholder="เช่น คลังสินค้าวังน้อย" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" value={form.destination} onChange={e => handleLocationChange('destination', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">วันที่ส่งมอบ</label>
                        <input type="date" required className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500" value={form.scheduledDestinationDate} onChange={e => setForm({ ...form, scheduledDestinationDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">เวลา</label>
                        <input type="time" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500" value={form.scheduledDestinationTime} onChange={e => setForm({ ...form, scheduledDestinationTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ชื่อผู้ติดต่อ</label>
                        <input type="text" placeholder="ชื่อผู้ส่ง" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500" value={form.destinationContactName} onChange={e => setForm({ ...form, destinationContactName: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">เบอร์โทรศัพท์</label>
                        <input type="tel" placeholder="08x-xxx-xxxx" className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500" value={form.destinationContactPhone} onChange={e => setForm({ ...form, destinationContactPhone: e.target.value })} />
                      </div>
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">รหัสงาน (Trip ID)</label>
                      <input type="text" required placeholder="TRP-..." className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.tripId} onChange={e => setForm({ ...form, tripId: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-purple-600 uppercase mb-1 flex items-center gap-1"><Truck size={12} /> จำนวนรถ (คัน)</label>
                      <input type="number" min="1" required className="w-full p-2.5 bg-white border border-purple-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-700" value={form.vehicleCount} onChange={e => setForm({ ...form, vehicleCount: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><Route size={12} /> ระยะทาง (km)</label>
                      <input type="number" step="0.01" required placeholder="คำนวณอัตโนมัติ" className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700" value={form.distance} onChange={e => setForm({ ...form, distance: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-orange-600 uppercase mb-1 flex items-center gap-1"><Package size={12} /> น้ำหนัก (ton)</label>
                      <input type="number" step="0.01" required placeholder="ระบุน้ำหนัก" className="w-full p-2.5 bg-white border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold text-orange-700" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-green-600 uppercase mb-1 flex items-center gap-1"><Leaf size={12} /> คาร์บอน (kgCO2e)</label>
                      <input type="number" step="0.01" required placeholder="ผลลัพธ์..." className="w-full p-2.5 bg-green-100 border border-green-300 rounded-lg text-sm outline-none font-bold text-green-800" value={form.carbon} onChange={e => setForm({ ...form, carbon: e.target.value })} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ชื่อบริษัทลูกค้า (Customer)</label>
                      <input list="customers-list" type="text" placeholder="เลือกลูกค้า หรือระบุชื่อใหม่" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
                      <datalist id="customers-list">
                        {masterCustomers.map(c => <option key={c._id} value={c.companyName} />)}
                      </datalist>
                    </div>
                    {(currentUser?.role === 'system_owner' || currentUser?.role === 'owner') && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ชื่อบริษัทขนส่ง (Provider)</label>
                        <input type="text" required placeholder="ระบุบริษัท" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className="font-bold py-3 px-10 rounded-xl text-sm transition-all" style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                    + สร้างงานขนส่ง
                  </button>
                </div>
              </form>
            </div>
          )}

          {renderTableContent()}
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