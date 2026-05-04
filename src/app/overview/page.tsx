'use client';

import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, InfoWindow, LoadScript, Marker } from '@react-google-maps/api';
import SidebarLayout from '@/components/SidebarLayout';
import { Loader2, MapPin } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const defaultCenter = { lat: 13.7563, lng: 100.5018 };

type ActiveMarker = {
  tripId: string;
  lat: number;
  lng: number;
  locationName: string;
  driverName: string;
  driverPhone: string;
};

export default function OverviewPage() {
  const [markers, setMarkers] = useState<ActiveMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMapError('');
      try {
        const res = await fetch('/api/overview/active-trucks', { cache: 'no-store' });
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        setMarkers(data.markers || []);
      } catch (error) {
        console.error('Overview fetch failed', error);
        setMapError('ไม่สามารถโหลดตำแหน่งรถได้ในขณะนี้');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 20000);
    return () => clearInterval(timer);
  }, []);

  const selected = useMemo(
    () => markers.find((item) => item.tripId === selectedTripId) || null,
    [markers, selectedTripId]
  );

  return (
    <SidebarLayout>
      <div className="min-h-screen rounded-3xl bg-[#071022] p-8 text-slate-100 shadow-[0_40px_120px_-80px_rgba(0,0,0,0.8)]">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#a5f3fc]">Overview</p>
            <h1 className="text-3xl font-bold text-white">Overview Dashboard</h1>
            <p className="mt-2 text-slate-400">แสดงตำแหน่งรถที่สถานะ Active พร้อมข้อมูลคนขับ</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-lg backdrop-blur-xl">
            Google Maps Key: <span className="font-semibold text-emerald-300">{GOOGLE_MAPS_API_KEY ? 'Configured' : 'Missing'}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0f1e35]/90 p-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          {(!GOOGLE_MAPS_API_KEY || mapError) ? (
            <div className="p-10 text-center text-sm text-rose-200">
              <p className="text-lg font-semibold text-rose-100">เกิดปัญหาในการโหลดแผนที่</p>
              <p className="mt-3">{!GOOGLE_MAPS_API_KEY ? 'ไม่พบ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY กรุณาตั้งค่าตัวแปรแวดล้อม' : mapError}</p>
            </div>
          ) : loading ? (
            <div className="h-[520px] flex items-center justify-center text-slate-300">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-emerald-300" /> กำลังโหลดตำแหน่งรถ...
            </div>
          ) : (
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} onError={() => setMapError('ไม่สามารถโหลด Google Maps API ได้ กรุณาตรวจสอบ KEY')}>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '520px' }}
                center={markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : defaultCenter}
                zoom={markers[0] ? 9 : 6}
              >
                {markers.map((marker) => (
                  <Marker
                    key={marker.tripId}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    onClick={() => setSelectedTripId(marker.tripId)}
                  />
                ))}

                {selected && (
                  <InfoWindow
                    position={{ lat: selected.lat, lng: selected.lng }}
                    onCloseClick={() => setSelectedTripId(null)}
                  >
                    <div className="text-sm">
                      <p className="font-semibold text-slate-900">Trip: {selected.tripId}</p>
                      <p className="text-slate-600">{selected.locationName}</p>
                      <p className="mt-2 text-slate-800">คนขับ: {selected.driverName}</p>
                      <p className="text-slate-800">โทร: {selected.driverPhone}</p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </LoadScript>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <MapPin size={16} /> Active Vehicles: {markers.length} คัน
        </div>
      </div>
    </SidebarLayout>
  );
}
