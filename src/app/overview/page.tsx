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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/overview/active-trucks', { cache: 'no-store' });
        const data = await res.json();
        setMarkers(data.markers || []);
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
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Overview Dashboard</h1>
          <p className="text-sm text-slate-500">แสดงตำแหน่งรถที่สถานะ Active เท่านั้น พร้อมข้อมูลคนขับ</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {!GOOGLE_MAPS_API_KEY ? (
            <div className="p-8 text-sm text-red-600">
              ไม่พบ `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` กรุณาตั้งค่า environment variable
            </div>
          ) : loading ? (
            <div className="h-[520px] flex items-center justify-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> กำลังโหลดตำแหน่งรถ...
            </div>
          ) : (
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '520px', borderRadius: '0.75rem' }}
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
