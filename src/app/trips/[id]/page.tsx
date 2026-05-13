'use client';

import React, { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import liff from '@line/liff';
import { useSession } from 'next-auth/react';
import { useJsApiLoader, GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import {
  Activity,
  AlertCircle,
  Banknote,
  Camera,
  CheckCircle,
  Clock,
  FileCheck,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Package,
  Play,
  Radio,
  ShieldCheck,
  Square,
  Truck,
  UserPlus,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getPusherClient } from '@/lib/pusher';

type Pin = {
  lat: number;
  lng: number;
  address?: string;
  googleMapsUrl?: string;
  speed?: number | null;
  heading?: number | null;
  timestamp?: number | null;
};

type TripHub = {
  _id: string;
  tripId: string;
  origin: string;
  destination: string;
  originMapUrl?: string;
  destinationMapUrl?: string;
  scheduledOriginDate?: string | null;
  scheduledOriginTime?: string;
  scheduledDestinationDate?: string | null;
  scheduledDestinationTime?: string;
  originContactName?: string;
  originContactPhone?: string;
  destinationContactName?: string;
  destinationContactPhone?: string;
  originPin?: Pin | null;
  destinationPin?: Pin | null;
  distance: number;
  weight: number;
  carbon: number;
  cargoType?: string;
  cargoName?: string;
  status: string;
  lineAssignmentStatus: string;
  opsStatus: string;
  lineUserId?: string;
  driverName?: string;
  licensePlate?: string;
  tailLicensePlate?: string;
  driverPhone?: string;
  companyName?: string;
  customerName?: string;
  podImageUrl?: string;
  deliveredAt?: string | null;
  gpsSession: {
    source: string;
    status: string;
    isTracking: boolean;
    startedAt?: string | null;
    stoppedAt?: string | null;
    lastPingAt?: string | null;
    currentPin?: Pin | null;
  };
  gpsHistory: Pin[];
  financials: {
    basePrice: number | null;
    driverPrice: number | null;
    platformFee: number | null;
    grossMarginPercent: number | null;
    offerStatus: string;
    discountPercent: number | null;
  } | null;
  access: {
    role: 'admin' | 'driver';
    canViewFinancials: boolean;
    lineUserId?: string;
  };
};

type ActiveUnitEvent = {
  tripId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
};

type GoogleMapsWindow = Window & {
  google?: typeof google;
};

const defaultCenter = { lat: 13.7563, lng: 100.5018 };
const mapContainerStyle = { width: '100%', height: '100%' };
const libraries: ('places')[] = ['places'];

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#082f49' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const timeline = [
  { key: 'accepted', label: 'รับงานแล้ว', detail: 'งานถูกล็อกเข้ากับรถและคนขับ' },
  { key: 'en_route_pickup', label: 'กำลังไปจุดรับ', detail: 'ระบบเริ่มติดตามตำแหน่งรถ' },
  { key: 'arrived_pickup', label: 'ถึงจุดรับแล้ว', detail: 'พร้อมรับสินค้าและตรวจเอกสารต้นทาง' },
  { key: 'en_route_dropoff', label: 'กำลังไปจุดส่ง', detail: 'รถออกจากต้นทางและกำลังเดินทาง' },
  { key: 'delivered', label: 'ส่งของสำเร็จ', detail: 'รออัปโหลดหรือยืนยัน POD' },
  { key: 'documents_submitted', label: 'ส่งเอกสารแล้ว', detail: 'รอทีมปฏิบัติการตรวจสอบ' },
];

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value?: string | number | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function shortCoordinate(pin?: Pin | null) {
  if (!pin) return '-';
  return `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`;
}

function statusIndex(status: string) {
  const index = timeline.findIndex(step => step.key === status);
  return index >= 0 ? index : 0;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function DigitalTripHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { status: sessionStatus } = useSession();
  const [lineUserId, setLineUserId] = useState(() => (
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('lineUserId') || ''
  ));
  const [trip, setTrip] = useState<TripHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [podUrl, setPodUrl] = useState('');
  const [approvedDrivers, setApprovedDrivers] = useState<any[]>([]);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const tripRef = useRef<TripHub | null>(null);
  const lastSyncRef = useRef(0);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);

  useEffect(() => {
    if (lineUserId) return;

    const initLiff = async () => {
      if (sessionStatus === 'authenticated') return;
      const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || '2010054204-bv5oRtcL';
      if (!liffId) return;
      try {
        await liff.init({ liffId });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineUserId(profile.userId);
        }
      } catch (err) {
        console.error('LIFF trip hub init error:', err);
      }
    };

    initLiff();
  }, [lineUserId, sessionStatus]);

  const fetchTrip = useCallback(async () => {
    if (sessionStatus === 'loading') return;
    try {
      const query = lineUserId ? `?lineUserId=${encodeURIComponent(lineUserId)}` : '';
      const res = await fetch(`/api/trips/${id}${query}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลทริปได้');
      setTrip(data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'ไม่สามารถโหลดข้อมูลทริปได้'));
    } finally {
      setLoading(false);
    }
  }, [id, lineUserId, sessionStatus]);

  useEffect(() => {
    const run = () => {
      void fetchTrip();
    };
    const initial = window.setTimeout(run, 0);
    const timer = window.setInterval(run, 20000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [fetchTrip]);

  useEffect(() => {
    if (!trip?.tripId || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe('fleet-tracking');
    channel.bind('location-updated', (event: ActiveUnitEvent) => {
      if (event.tripId !== trip.tripId) return;
      const currentPin = {
        lat: event.lat,
        lng: event.lng,
        speed: event.speed ?? null,
        heading: event.heading ?? null,
        timestamp: event.timestamp || Date.now(),
        googleMapsUrl: `https://www.google.com/maps?q=${event.lat},${event.lng}`,
      };
      setTrip(prev => prev ? {
        ...prev,
        gpsSession: {
          ...prev.gpsSession,
          status: 'active',
          isTracking: true,
          lastPingAt: new Date().toISOString(),
          currentPin,
        },
        gpsHistory: [...prev.gpsHistory.slice(-119), currentPin],
      } : prev);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('fleet-tracking');
    };
  }, [trip?.tripId]);

  const syncLocation = useCallback(async (pin: Pin) => {
    const activeTrip = tripRef.current;
    if (!activeTrip) return;
    try {
      await fetch('/api/trips/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: activeTrip.tripId,
          lineUserId,
          lat: pin.lat,
          lng: pin.lng,
          speed: pin.speed,
          heading: pin.heading,
          timestamp: pin.timestamp,
        }),
      });
    } catch (err) {
      console.error('Location sync failed:', err);
    }
  }, [lineUserId]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setNotice('อุปกรณ์นี้ไม่รองรับ GPS ในเบราว์เซอร์');
      return;
    }
    if (watchId !== null) return;

    const id = navigator.geolocation.watchPosition(
      position => {
        const pin: Pin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };
        setTrip(prev => prev ? {
          ...prev,
          gpsSession: {
            ...prev.gpsSession,
            status: 'active',
            isTracking: true,
            lastPingAt: new Date().toISOString(),
            currentPin: pin,
          },
          gpsHistory: [...prev.gpsHistory.slice(-119), pin],
        } : prev);

        const now = Date.now();
        if (now - lastSyncRef.current > 15000) {
          lastSyncRef.current = now;
          syncLocation(pin);
        }
      },
      err => {
        setNotice(err.code === 1 ? 'กรุณาอนุญาตการเข้าถึงตำแหน่ง GPS' : 'ไม่สามารถอ่านพิกัด GPS ได้');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
    setWatchId(id);
    setIsTracking(true);
  }, [syncLocation, watchId]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    setWatchId(null);
    setIsTracking(false);
  }, [watchId]);

  useEffect(() => stopTracking, [stopTracking]);

  const patchTrip = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    setNotice(null);
    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, lineUserId, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'อัปเดตสถานะไม่สำเร็จ');
      setTrip(data.trip);
      if (action === 'start_to_pickup') startTracking();
      if (action === 'request_pod') setNotice('ระบบตั้งค่าให้ส่ง POD ผ่าน LINE แล้ว พี่ส่งรูปหลักฐานในแชทนี้ได้เลย');
      if (action === 'submit_pod_url') {
        setNotice('บันทึก POD แล้ว');
        setPodUrl('');
      }
    } catch (err) {
      setNotice(errorMessage(err, 'อัปเดตสถานะไม่สำเร็จ'));
    } finally {
      setActionLoading(null);
    }
  };
  
  const fetchApprovedDrivers = async () => {
    try {
      const res = await fetch('/api/admin/drivers/approved');
      if (res.ok) {
        const data = await res.json();
        setApprovedDrivers(data);
      }
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    }
  };

  const bindDriver = async (selectedLineUserId: string) => {
    setActionLoading('binding_driver');
    try {
      const res = await fetch(`/api/admin/trips/${id}/bind-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: selectedLineUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Binding failed');
      setTrip(data.trip);
      setShowDriverPicker(false);
      setNotice('ผูกข้อมูลคนขับเรียบร้อยแล้ว');
    } catch (err) {
      setNotice(errorMessage(err, 'ผูกข้อมูลคนขับไม่สำเร็จ'));
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (trip?.access.role === 'admin') {
      fetchApprovedDrivers();
    }
  }, [trip?.access.role]);

  const center = useMemo(() => (
    trip?.gpsSession.currentPin ||
    trip?.originPin ||
    trip?.destinationPin ||
    defaultCenter
  ), [trip]);

  const routePath = useMemo(() => {
    const points = [trip?.originPin, trip?.destinationPin].filter(Boolean) as Pin[];
    return points.map(point => ({ lat: point.lat, lng: point.lng }));
  }, [trip?.originPin, trip?.destinationPin]);

  const gpsPath = useMemo(() => (
    (trip?.gpsHistory || []).map(point => ({ lat: point.lat, lng: point.lng }))
  ), [trip?.gpsHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-300" size={30} />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center border border-red-400/20 bg-red-400/10 rounded-2xl p-8">
          <AlertCircle className="mx-auto mb-4 text-red-300" size={42} />
          <h1 className="text-xl font-black mb-2">เปิดใบงานไม่ได้</h1>
          <p className="text-sm text-slate-300">{error || 'ไม่พบข้อมูลทริป'}</p>
        </div>
      </div>
    );
  }

  const currentStep = statusIndex(trip.opsStatus);
  const isDriver = trip.access.role === 'driver';
  const currentPin = trip.gpsSession.currentPin;
  const maps = typeof window !== 'undefined' ? (window as GoogleMapsWindow).google?.maps : undefined;
  const truckIcon: google.maps.Symbol | undefined = isLoaded && maps
    ? {
        path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillColor: '#22d3ee',
        fillOpacity: 1,
        strokeColor: '#ecfeff',
        strokeWeight: 2,
        scale: 6,
        rotation: currentPin?.heading || 0,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 flex items-center justify-center">
              <Truck className="text-emerald-300" size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight md:text-2xl">{trip.tripId}</h1>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                  Digital Trip Hub
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-400">
                {trip.origin} ไป {trip.destination}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Live GPS</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black">
                <Radio size={14} className={trip.gpsSession.isTracking || isTracking ? 'text-emerald-300' : 'text-slate-500'} />
                {trip.gpsSession.isTracking || isTracking ? 'Online' : 'Standby'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Last Ping</p>
              <p className="mt-1 text-sm font-black">{formatDateTime(trip.gpsSession.lastPingAt || currentPin?.timestamp)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 md:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] md:px-8">
        <section className="space-y-5">
          <div className="h-[460px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl md:h-[620px]">
            {!isLoaded ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="animate-spin" size={26} />
                <span className="text-xs font-bold uppercase tracking-[0.22em]">Loading Map</span>
              </div>
            ) : loadError ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-red-200">
                <AlertCircle size={38} />
                <p className="font-bold">Google Maps ยังไม่พร้อมใช้งาน</p>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={currentPin ? 13 : 10}
                options={{ disableDefaultUI: true, styles: mapStyle }}
              >
                {routePath.length === 2 && (
                  <Polyline
                    path={routePath}
                    options={{
                      strokeColor: '#f59e0b',
                      strokeOpacity: 0.85,
                      strokeWeight: 4,
                      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '18px' }],
                    }}
                  />
                )}
                {gpsPath.length > 1 && (
                  <Polyline
                    path={gpsPath}
                    options={{ strokeColor: '#22d3ee', strokeOpacity: 0.95, strokeWeight: 5 }}
                  />
                )}
                {trip.originPin && (
                  <Marker position={trip.originPin} label={{ text: 'A', color: '#ffffff', fontWeight: 'bold' }} />
                )}
                {trip.destinationPin && (
                  <Marker position={trip.destinationPin} label={{ text: 'B', color: '#ffffff', fontWeight: 'bold' }} />
                )}
                {currentPin && (
                  <Marker
                    position={currentPin}
                    icon={truckIcon}
                    label={!truckIcon ? { text: 'Truck', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' } : undefined}
                  />
                )}
              </GoogleMap>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={Package} label="สินค้า" value={trip.cargoName || trip.cargoType || '-'} tone="emerald" />
            <Metric icon={Navigation} label="ระยะทาง" value={`${trip.distance || 0} km`} tone="cyan" />
            <Metric icon={Activity} label="น้ำหนัก" value={`${trip.weight || 0} ton`} tone="amber" />
            <Metric icon={ShieldCheck} label="Carbon" value={`${Number(trip.carbon || 0).toLocaleString()} kgCO2e`} tone="violet" />
          </div>

          {trip.access.canViewFinancials && trip.financials && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">System Owner Visibility</p>
                  <h2 className="mt-1 text-lg font-black">ต้นทุนและกำไร</h2>
                </div>
                <Banknote className="text-emerald-300" size={22} />
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="ราคาตั้งต้น" value={formatMoney(trip.financials.basePrice)} tone="cyan" />
                <Metric label="ค่ารถร่วม" value={formatMoney(trip.financials.driverPrice)} tone="amber" />
                <Metric label="ส่วนต่าง" value={formatMoney(trip.financials.platformFee)} tone="emerald" />
                <Metric label="Margin" value={trip.financials.grossMarginPercent !== null ? `${trip.financials.grossMarginPercent}%` : '-'} tone="violet" />
              </div>
            </section>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Trip Status Timeline</p>
                <h2 className="mt-1 text-lg font-black">{timeline[currentStep]?.label || trip.opsStatus}</h2>
              </div>
              <Clock className="text-cyan-300" size={22} />
            </div>
            <div className="mt-5 space-y-4">
              {timeline.map((step, index) => (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${
                      index <= currentStep ? 'border-emerald-300 bg-emerald-300 text-slate-950' : 'border-white/10 bg-white/5 text-slate-500'
                    }`}>
                      {index <= currentStep ? <CheckCircle size={16} /> : <span className="text-xs font-black">{index + 1}</span>}
                    </div>
                    {index < timeline.length - 1 && <div className={`mt-2 h-8 w-px ${index < currentStep ? 'bg-emerald-300/70' : 'bg-white/10'}`} />}
                  </div>
                  <div className="pt-1">
                    <p className={index <= currentStep ? 'text-sm font-black text-white' : 'text-sm font-bold text-slate-500'}>{step.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">Route Manifest</p>
            <div className="mt-5 space-y-4">
              <RoutePoint tone="amber" label="จุดรับ" title={trip.origin} time={`${formatDateTime(trip.scheduledOriginDate)} ${trip.scheduledOriginTime || ''}`} contact={trip.originContactName} phone={trip.originContactPhone} url={trip.originMapUrl} />
              <RoutePoint tone="emerald" label="จุดส่ง" title={trip.destination} time={`${formatDateTime(trip.scheduledDestinationDate)} ${trip.scheduledDestinationTime || ''}`} contact={trip.destinationContactName} phone={trip.destinationContactPhone} url={trip.destinationMapUrl} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Vehicle & Driver</p>
              {!isDriver && (
                <button
                  onClick={() => setShowDriverPicker(!showDriverPicker)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-300/20"
                >
                  <UserPlus size={12} />
                  {trip.lineUserId ? 'เปลี่ยนคนขับ' : 'ผูกคนขับ LINE'}
                </button>
              )}
            </div>

            {showDriverPicker && !isDriver && (
              <div className="mb-5 rounded-xl border border-white/10 bg-slate-900 p-3 shadow-xl">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อหรือทะเบียน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:border-emerald-300/50 outline-none"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {approvedDrivers
                    .filter(d => 
                      d.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      d.licensePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.phone?.includes(searchQuery)
                    )
                    .map(d => (
                      <button
                        key={d.lineUserId}
                        onClick={() => bindDriver(d.lineUserId)}
                        disabled={actionLoading === 'binding_driver'}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <img src={d.pictureUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} className="h-8 w-8 rounded-full border border-white/10" alt="" />
                          <div>
                            <p className="text-xs font-black text-white">{d.displayName} <span className="ml-1 text-[9px] text-slate-500 font-mono">({d.lineUserId.substring(0, 6)}...)</span></p>
                            <p className="text-[10px] text-slate-500 font-bold">{d.licensePlate} · {d.phone}</p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle size={16} className="text-emerald-300" />
                        </div>
                      </button>
                    ))}
                  {approvedDrivers.length === 0 && (
                    <p className="text-center py-4 text-[11px] text-slate-500 font-bold">ไม่พบคนขับที่ได้รับอนุมัติแล้ว</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-3">
              <InfoLine label="คนขับ" value={trip.driverName || '-'} />
              <InfoLine label="LINE ID" value={trip.lineUserId ? `${trip.lineUserId.substring(0, 8)}...` : '-'} />
              <InfoLine label="เบอร์โทร" value={trip.driverPhone || '-'} />
              <InfoLine label="ทะเบียนหัว" value={trip.licensePlate || '-'} />
              <InfoLine label="ทะเบียนหาง" value={trip.tailLicensePlate || '-'} />
              <InfoLine label="พิกัดล่าสุด" value={shortCoordinate(currentPin)} />
            </div>
          </section>

          {isDriver && (
            <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Driver Actions</p>
              <div className="mt-4 grid gap-3">
                <ActionButton icon={Play} label="เริ่มเดินทาง" disabled={currentStep > 0} loading={actionLoading === 'start_to_pickup'} onClick={() => patchTrip('start_to_pickup')} />
                <ActionButton icon={MapPin} label="ถึงจุดรับ" disabled={currentStep > 2} loading={actionLoading === 'arrive_pickup'} onClick={() => patchTrip('arrive_pickup')} />
                <ActionButton icon={Navigation} label="ออกไปจุดส่ง" disabled={currentStep > 3} loading={actionLoading === 'start_to_dropoff'} onClick={() => patchTrip('start_to_dropoff')} />
                <ActionButton icon={FileCheck} label="ส่งของสำเร็จ" disabled={currentStep > 4} loading={actionLoading === 'complete_delivery'} onClick={() => patchTrip('complete_delivery')} />
                <button
                  type="button"
                  onClick={() => isTracking ? stopTracking() : startTracking()}
                  className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-100 flex items-center justify-center gap-2 transition hover:bg-white/10"
                >
                  {isTracking ? <Square size={16} /> : <LocateFixed size={16} />}
                  {isTracking ? 'หยุดส่ง GPS ชั่วคราว' : 'เริ่มส่ง GPS'}
                </button>
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => patchTrip('request_pod')}
                  disabled={actionLoading === 'request_pod'}
                  className="mb-3 h-11 w-full rounded-xl bg-cyan-300 text-slate-950 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {actionLoading === 'request_pod' ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                  เปิดรับ POD ผ่าน LINE
                </button>
                <div className="flex gap-2">
                  <input
                    value={podUrl}
                    onChange={event => setPodUrl(event.target.value)}
                    placeholder="วางลิงก์ไฟล์ POD"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    disabled={!podUrl || actionLoading === 'submit_pod_url'}
                    onClick={() => patchTrip('submit_pod_url', { podUrl })}
                    className="h-11 rounded-xl bg-emerald-300 px-4 text-xs font-black text-slate-950 disabled:opacity-40"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </section>
          )}

          {notice && (
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">
              {notice}
            </div>
          )}

          {trip.access.canViewFinancials && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">GPS Ping History</p>
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {trip.gpsHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">ยังไม่มีประวัติ ping</p>
                ) : (
                  [...trip.gpsHistory].reverse().slice(0, 20).map((pin, index) => (
                    <div key={`${pin.timestamp || index}-${pin.lat}-${pin.lng}`} className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-white">{shortCoordinate(pin)}</span>
                        <span className="text-[10px] font-bold text-slate-500">{formatDateTime(pin.timestamp)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">Speed {pin.speed ? Math.round(pin.speed * 3.6) : 0} km/h · Heading {pin.heading ? Math.round(pin.heading) : 0}°</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon?: LucideIcon; label: string; value: string; tone: 'emerald' | 'cyan' | 'amber' | 'violet' }) {
  const color = {
    emerald: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
    cyan: 'text-cyan-300 bg-cyan-300/10 border-cyan-300/20',
    amber: 'text-amber-300 bg-amber-300/10 border-amber-300/20',
    violet: 'text-violet-300 bg-violet-300/10 border-violet-300/20',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">{label}</p>
        {Icon && <Icon size={17} />}
      </div>
      <p className="mt-3 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function RoutePoint({ tone, label, title, time, contact, phone, url }: { tone: 'amber' | 'emerald'; label: string; title: string; time: string; contact?: string; phone?: string; url?: string }) {
  const dot = tone === 'amber' ? 'bg-amber-300' : 'bg-emerald-300';
  return (
    <div className="flex gap-3">
      <span className={`mt-1 h-3 w-3 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-cyan-300">เปิดแผนที่</a>}
        </div>
        <p className="mt-1 text-sm font-black leading-snug text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{time}</p>
        {(contact || phone) && <p className="mt-1 text-xs text-slate-400">{contact || '-'} · {phone || '-'}</p>}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 last:border-b-0">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-black text-white">{value}</span>
    </div>
  );
}

function ActionButton({ icon: Icon, label, disabled, loading, onClick }: { icon: LucideIcon; label: string; disabled?: boolean; loading?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="h-12 rounded-xl bg-emerald-300 px-4 text-sm font-black text-slate-950 flex items-center justify-center gap-2 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : <Icon size={16} />}
      {label}
    </button>
  );
}
