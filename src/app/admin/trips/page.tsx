'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Truck, MapPin, Leaf, PlusCircle, ExternalLink, MapPinned, X, Route, Package, Edit2, Trash2 } from 'lucide-react';
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
  const [editTripId, setEditTripId] = useState<string | null>(null);

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

  const generateTripId = (user: any, allTrips: any[]) => {
    if (!user?.companyName) return '';
    
    // Get 3-letter abbreviation from company name
    const cleanName = user.companyName.replace('บริษัท', '').trim();
    const abbr = cleanName.substring(0, 3).toUpperCase();
    
    // Get date in DDMMYYYY format
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const dateStr = `${d}${m}${y}`;
    
    // Filter trips for today to find sequence (using Trip ID pattern matching)
    const pattern = `${abbr}${dateStr}`;
    const todayTrips = allTrips.filter(t => t.tripId && t.tripId.startsWith(pattern));
    
    let nextNum = 1;
    if (todayTrips.length > 0) {
      const lastTripId = todayTrips[todayTrips.length - 1].tripId;
      const lastNumStr = lastTripId.replace(pattern, '').split('-')[0]; // Handle cases with suffix
      const lastNum = parseInt(lastNumStr);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    
    const seq = String(nextNum).padStart(3, '0');
    return `${abbr}${dateStr}${seq}`;
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !session) {
      router.push('/');
      return;
    }

    fetchInitialData(session);
  }, [status, session, router]);

  // 🟢 Effect: Auto-generate Trip ID when creating a new trip
  useEffect(() => {
    if (!editTripId && currentUser && trips.length >= 0 && !form.tripId) {
      const newId = generateTripId(currentUser, trips);
      if (newId) {
        setForm(prev => ({ ...prev, tripId: newId }));
      }
    }
  }, [currentUser, trips, editTripId]);

  // 🟢 Effect: คำนวณระยะทางอัตโนมัติ
  useEffect(() => {
    if (form.originMapUrl && form.destinationMapUrl && (window as any).google) {
      calculateDistance();
    }
  }, [form.originMapUrl, form.destinationMapUrl]);

  // 🟢 Effect: คำนวณคาร์บอนอัตโนมัติ (รวมจำนวนรถ)
  useEffect(() => {
    if (form.distance && form.weight) {
      const carbonVal = (Number(form.distance) * Number(form.weight) * 0.062).toFixed(2);
      setForm(prev => ({ ...prev, carbon: carbonVal }));
    }
  }, [form.distance, form.weight]);

  const handleLocationChange = (type: 'origin' | 'destination', value: string) => {
    setForm(prev => ({ ...prev, [type]: value }));

    // Auto-fill logic
    const locationMatch = masterLocations.find((loc: any) => loc.name === value);
    if (locationMatch) {
      if (type === 'origin') {
        setForm(prev => ({
          ...prev,
          originMapUrl: ensureHttps(locationMatch.locationLink) || prev.originMapUrl,
          originContactName: locationMatch.contactPerson || prev.originContactName,
          originContactPhone: locationMatch.phoneNumber || prev.originContactPhone,
        }));
      } else {
        setForm(prev => ({
          ...prev,
          destinationMapUrl: ensureHttps(locationMatch.locationLink) || prev.destinationMapUrl,
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

  const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('www.')) return `https://${url}`;
    if (url.startsWith('google.com') || url.startsWith('maps.google.com')) return `https://www.${url}`;
    return url;
  };

  const confirmLocation = () => {
    if (!markerPos) return;
    const mapUrl = `https://www.google.com/maps?q=${markerPos.lat},${markerPos.lng}`;

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
      const isEdit = !!editTripId;
      const url = isEdit ? `/api/admin/trips/${editTripId}` : '/api/admin/trips';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: form.tripId,
          origin: form.origin, originMapUrl: ensureHttps(form.originMapUrl),
          scheduledOriginDate: form.scheduledOriginDate,
          scheduledOriginTime: form.scheduledOriginTime,
          originContactName: form.originContactName,
          originContactPhone: form.originContactPhone,

          destination: form.destination, destinationMapUrl: ensureHttps(form.destinationMapUrl),
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
        alert(isEdit ? 'แก้ไขงานเรียบร้อยแล้ว!' : 'เพิ่มงานขนส่งเรียบร้อยแล้ว!');
        setForm(initialFormState);
        if (isEdit) {
          setTrips(prev => prev.map(t => t._id === editTripId ? data.trip : t));
          setEditTripId(null);
        } else {
          const newTrips = data.trips || [data.trip];
          setTrips(prev => [...newTrips, ...prev]);
        }
        fetchInitialData();
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) { alert('ระบบขัดข้อง'); }
  };

  const handleEditClick = (trip: any) => {
    setEditTripId(trip._id);
    setForm({
      tripId: trip.tripId || '',
      origin: trip.origin || '', originMapUrl: trip.originMapUrl || '',
      scheduledOriginDate: trip.scheduledOriginDate || '', scheduledOriginTime: trip.scheduledOriginTime || '', 
      originContactName: trip.originContactName || '', originContactPhone: trip.originContactPhone || '',
      destination: trip.destination || '', destinationMapUrl: trip.destinationMapUrl || '',
      scheduledDestinationDate: trip.scheduledDestinationDate || '', scheduledDestinationTime: trip.scheduledDestinationTime || '',
      destinationContactName: trip.destinationContactName || '', destinationContactPhone: trip.destinationContactPhone || '',
      distance: trip.distance || '', weight: trip.weight || '', carbon: trip.carbon || '', 
      companyName: trip.companyName || '', customerName: trip.customerName || '',
      vehicleCount: trip.vehicleCount || 1,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('คุณต้องการลบงานนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/admin/trips/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('ลบงานเรียบร้อยแล้ว');
        setTrips(prev => prev.filter(t => t._id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาดในการลบงาน');
      }
    } catch { alert('ระบบขัดข้อง'); }
  };

  const handleSendToSharedTrucks = async (trip: { _id: string; tripId: string }) => {
    const input = prompt(`กรอกราคาตั้งต้นสำหรับงาน ${trip.tripId}\nระบบจะส่งให้รถร่วมในราคา -1%`);
    if (!input) return;

    const basePrice = Number(input.replace(/,/g, '').trim());
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      alert('กรุณากรอกราคาเป็นตัวเลขมากกว่า 0');
      return;
    }

    try {
      const res = await fetch('/api/admin/line-job-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip._id, basePrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'ส่งงานให้รถร่วมไม่สำเร็จ');
        return;
      }
      alert(data.message || 'ส่งงานให้รถร่วมสำเร็จ');
      fetchInitialData();
    } catch {
      alert('ระบบขัดข้องขณะส่งงานให้รถร่วม');
    }
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
              <th className="p-4 font-bold text-center">จัดการ</th>
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
                  <td className="p-4"><div className="h-6 bg-slate-200 animate-pulse rounded w-12 mx-auto"></div></td>
                </tr>
              ))
            ) : displayedTrips.length === 0 ? (
              <tr><td colSpan={8} className="p-12 text-center text-slate-400 italic font-medium">ยังไม่พบข้อมูลงานในระบบ</td></tr>
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
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button type="button" onClick={() => handleEditClick(trip)} className="text-slate-400 hover:text-blue-600 transition-colors" title="แก้ไขงาน">
                        <Edit2 size={16} />
                      </button>
                      {currentUser?.role === 'system_owner' && (
                        <button type="button" onClick={() => handleSendToSharedTrucks(trip)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="ส่งงานให้รถร่วม">
                          <Truck size={16} />
                        </button>
                      )}
                      <button type="button" onClick={() => handleDeleteTrip(trip._id)} className="text-slate-400 hover:text-red-500 transition-colors" title="ลบงาน">
                        <Trash2 size={16} />
                      </button>
                    </div>
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
                {editTripId ? <Edit2 size={18} className="text-blue-500" /> : <PlusCircle size={18} className="text-blue-500" />} 
                {editTripId ? `แก้ไขรายละเอียดงาน: ${form.tripId}` : 'รายละเอียดงานใหม่'}
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

                  <div className="mt-4">
                    {(currentUser?.role === 'system_owner' || currentUser?.role === 'owner') && (
                      <div className="max-w-md">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ชื่อบริษัทขนส่ง (Provider)</label>
                        <input type="text" required placeholder="ระบุบริษัท" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  {editTripId && (
                    <button type="button" onClick={() => { setEditTripId(null); setForm(initialFormState); }} className="font-bold py-3 px-6 rounded-xl text-sm transition-all bg-slate-100 text-slate-600 hover:bg-slate-200">
                      ยกเลิก
                    </button>
                  )}
                  <button type="submit" className={`font-bold py-3 px-10 rounded-xl text-sm transition-all text-white shadow-lg ${editTripId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}>
                    {editTripId ? 'บันทึกการแก้ไข' : '+ สร้างงานขนส่ง'}
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
