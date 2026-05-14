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

// Modern light mode design relies on the default map style.

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
  const [lineUserId, setLineUserId] = useState(() => {
    if (typeof window === 'undefined') return '';
    // If the URL ID is a LINE ID, use it immediately
    if (id.startsWith('U') && id.length === 33) return id;
    // Fallback to query param for backward compatibility or Admin view with driver context
    return new URLSearchParams(window.location.search).get('lineUserId') || '';
  });
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
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const [localPin, setLocalPin] = useState<Pin | null>(null);

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
      const res = await fetch(`/api/trips/${id}${query}`, { 
        cache: 'no-store',
        // Next.js automatically handles cookies for fetch on the same origin
      });
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
    // Real-time local positioning for visualization
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocalPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.log('Local location access denied or failed:', err),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
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

  const currentPin = trip?.gpsSession?.currentPin;
  const maps = typeof window !== 'undefined' ? (window as GoogleMapsWindow).google?.maps : undefined;

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

  const activeSegmentPath = useMemo(() => {
    const step = statusIndex(trip?.opsStatus || '');
    const currentLoc = currentPin || localPin;
    
    if (!currentLoc) return [];
    
    // step 1 or 2 -> heading to pickup
    if ((step === 1 || step === 2) && trip?.originPin) {
      return [currentLoc, trip.originPin].map(p => ({ lat: p.lat, lng: p.lng }));
    }
    
    // step 3 or 4 -> heading to dropoff
    if ((step === 3 || step === 4) && trip?.destinationPin) {
      return [currentLoc, trip.destinationPin].map(p => ({ lat: p.lat, lng: p.lng }));
    }
    
    return [];
  }, [trip?.opsStatus, currentPin, localPin, trip?.originPin, trip?.destinationPin]);

  const panToPoint = useCallback((pin?: Pin | null) => {
    console.log('Panning to:', pin);
    if (!mapInstance || !pin || !pin.lat || !pin.lng) return;
    mapInstance.panTo({ lat: pin.lat, lng: pin.lng });
    mapInstance.setZoom(17);
    setIsBottomSheetExpanded(false);
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance || !maps) return;
    const bounds = new maps.LatLngBounds();
    let hasPoints = false;

    // Smart Context-Aware Bounding based on Trip Status
    const step = statusIndex(trip?.opsStatus || '');
    
    // step 0 (accepted): Overview (Origin + Destination)
    // step 1, 2 (pickup phase): Focus on Origin
    // step 3, 4, 5 (dropoff phase): Focus on Destination
    const showOrigin = step <= 2;
    const showDestination = step === 0 || step >= 3;

    if (showOrigin && trip?.originPin) {
      bounds.extend({ lat: trip.originPin.lat, lng: trip.originPin.lng });
      hasPoints = true;
    }
    if (showDestination && trip?.destinationPin) {
      bounds.extend({ lat: trip.destinationPin.lat, lng: trip.destinationPin.lng });
      hasPoints = true;
    }
    
    // Always ensure the driver's location is in view
    if (currentPin) {
      bounds.extend({ lat: currentPin.lat, lng: currentPin.lng });
      hasPoints = true;
    } else if (localPin) {
      bounds.extend({ lat: localPin.lat, lng: localPin.lng });
      hasPoints = true;
    }

    if (hasPoints) {
      // Add padding to ensure points aren't hidden behind the bottom sheet
      mapInstance.fitBounds(bounds, { top: 60, right: 40, bottom: 350, left: 40 });
    } else {
      mapInstance.setCenter(defaultCenter);
      mapInstance.setZoom(10);
    }
  }, [mapInstance, maps, trip?.originPin, trip?.destinationPin, trip?.opsStatus, currentPin, localPin]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={30} />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center border border-red-200 bg-red-50 rounded-3xl p-8 shadow-xl">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={42} />
          <h1 className="text-xl font-black mb-2">เปิดใบงานไม่ได้</h1>
          <p className="text-sm text-slate-600">{error || 'ไม่พบข้อมูลทริป'}</p>
        </div>
      </div>
    );
  }

  const currentStep = statusIndex(trip.opsStatus);
  const isDriver = trip.access.role === 'driver';
  const truckIcon: google.maps.Symbol | undefined = isLoaded && maps
    ? {
        path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 6,
        rotation: currentPin?.heading || 0,
      }
    : undefined;
  
  const userDotIcon: google.maps.Symbol | undefined = isLoaded && maps
    ? {
        path: maps.SymbolPath.CIRCLE,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 7,
      }
    : undefined;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 text-slate-900 relative">
      {/* MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        {!isLoaded ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-100">
            <Loader2 className="animate-spin" size={26} />
            <span className="text-xs font-bold uppercase tracking-[0.22em]">Loading Map</span>
          </div>
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-red-500 bg-slate-100">
            <AlertCircle size={38} />
            <p className="font-bold">Google Maps ยังไม่พร้อมใช้งาน</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={currentPin ? 13 : 10}
            options={{ 
              disableDefaultUI: true, 
              gestureHandling: 'greedy',
              maxZoom: 16,
            }}
            onLoad={(map) => setMapInstance(map)}
          >
            {routePath.length === 2 && (
              <Polyline
                path={routePath}
                options={{
                  strokeColor: '#64748b',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                  icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '20px' }],
                }}
              />
            )}
            {gpsPath.length > 1 && (
              <Polyline
                path={gpsPath}
                options={{ strokeColor: '#3b82f6', strokeOpacity: 0.9, strokeWeight: 5 }}
              />
            )}
            {activeSegmentPath.length === 2 && (
              <Polyline
                path={activeSegmentPath}
                options={{
                  strokeColor: '#4f46e5', // indigo-600
                  strokeOpacity: 0.9,
                  strokeWeight: 6,
                  geodesic: true,
                  zIndex: 10,
                }}
              />
            )}
            {trip.originPin && (
              <Marker position={trip.originPin} label={{ text: 'A', color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }} />
            )}
            {trip.destinationPin && (
              <Marker position={trip.destinationPin} label={{ text: 'B', color: '#ffffff', fontSize: '12px', fontWeight: 'bold' }} />
            )}
            {currentPin && (
              <Marker
                position={currentPin}
                icon={truckIcon}
                label={!truckIcon ? { text: 'Truck', color: '#000000', fontSize: '11px', fontWeight: 'bold' } : undefined}
                zIndex={999}
              />
            )}
            {localPin && !currentPin && (
              <Marker
                position={localPin}
                icon={userDotIcon}
                zIndex={998}
              />
            )}
          </GoogleMap>
        )}
      </div>

      {/* FLOATING MAP TOOLS */}
      <div className="absolute right-4 top-24 z-10 flex flex-col gap-2 pointer-events-none">
        <button
          onClick={() => panToPoint(localPin || currentPin)}
          className="h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-700 pointer-events-auto active:bg-slate-100 transition-colors border border-slate-100"
          title="Center on my location"
        >
          <LocateFixed size={22} />
        </button>
      </div>

      {/* FLOATING HEADER */}
      <header className="relative z-10 p-4 md:p-6 pointer-events-none">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="rounded-3xl bg-white/95 p-4 shadow-lg backdrop-blur-md pointer-events-auto border border-slate-100 max-w-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Truck size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-slate-800">{trip.tripId}</h1>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">
                    Live
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-500">
                  {trip.origin} → {trip.destination}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <Radio size={14} className={trip.gpsSession.isTracking || isTracking ? 'text-emerald-500 animate-pulse' : 'text-slate-400'} />
                <span className="text-xs font-bold text-slate-600">
                  {trip.gpsSession.isTracking || isTracking ? 'Online' : 'Standby'}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-[10px] font-bold text-slate-500">{formatDateTime(trip.gpsSession.lastPingAt || currentPin?.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* EXPANDABLE BOTTOM SHEET / SIDE PANEL */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 flex flex-col transition-transform duration-500 ease-out md:static md:w-[450px] md:h-full md:border-l md:border-slate-200 md:bg-white md:shadow-2xl md:transform-none ${
        isBottomSheetExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'
      }`}>
        <div 
          className="flex h-20 w-full cursor-pointer items-center justify-center rounded-t-3xl bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:hidden border-b border-slate-100"
          onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {isBottomSheetExpanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียดงาน'}
            </span>
          </div>
        </div>

        <div className="h-[70vh] overflow-y-auto bg-white p-5 pb-24 md:h-full md:p-8 custom-scrollbar">
          
          {/* Timeline */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="text-blue-500" size={18} />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Status Timeline</h2>
            </div>
            <div className="space-y-4">
              {timeline.map((step, index) => (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                      index <= currentStep ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-400'
                    }`}>
                      {index <= currentStep ? <CheckCircle size={14} /> : <span className="text-[10px] font-black">{index + 1}</span>}
                    </div>
                    {index < timeline.length - 1 && <div className={`mt-1 h-8 w-0.5 rounded-full ${index < currentStep ? 'bg-emerald-500' : 'bg-slate-100'}`} />}
                  </div>
                  <div className="pt-0.5 pb-2">
                    <p className={index <= currentStep ? 'text-sm font-black text-slate-800' : 'text-sm font-bold text-slate-400'}>{step.label}</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Metrics */}
          <div className="mb-8 grid grid-cols-2 gap-3">
            <Metric icon={Package} label="สินค้า" value={trip.cargoName || trip.cargoType || '-'} tone="emerald" />
            <Metric icon={Navigation} label="ระยะทาง" value={`${trip.distance || 0} km`} tone="blue" />
            <Metric icon={Activity} label="น้ำหนัก" value={`${trip.weight || 0} ton`} tone="amber" />
            <Metric icon={ShieldCheck} label="Carbon" value={`${Number(trip.carbon || 0).toLocaleString()} kg`} tone="violet" />
          </div>

          {/* Route Manifest */}
          <section className="mb-8 rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Route Manifest</h2>
            <div className="space-y-5">
              <RoutePoint 
                tone="amber" 
                label="จุดรับ" 
                title={trip.origin} 
                time={`${formatDateTime(trip.scheduledOriginDate)} ${trip.scheduledOriginTime || ''}`} 
                contact={trip.originContactName} 
                phone={trip.originContactPhone} 
                onClick={() => panToPoint(trip.originPin)}
              />
              <RoutePoint 
                tone="emerald" 
                label="จุดส่ง" 
                title={trip.destination} 
                time={`${formatDateTime(trip.scheduledDestinationDate)} ${trip.scheduledDestinationTime || ''}`} 
                contact={trip.destinationContactName} 
                phone={trip.destinationContactPhone} 
                onClick={() => panToPoint(trip.destinationPin)}
              />
            </div>
          </section>

          {/* Vehicle & Driver */}
          <section className="mb-8 rounded-3xl border border-slate-100 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle & Driver</h2>
              {!isDriver && (
                <button
                  onClick={() => setShowDriverPicker(!showDriverPicker)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:bg-slate-200"
                >
                  <UserPlus size={12} />
                  {trip.lineUserId ? 'เปลี่ยนคนขับ' : 'ผูกคนขับ LINE'}
                </button>
              )}
            </div>

            {showDriverPicker && !isDriver && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อหรือทะเบียน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 outline-none"
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
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-300 transition text-left group shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <img src={d.pictureUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} className="h-9 w-9 rounded-full border border-slate-100" alt="" />
                          <div>
                            <p className="text-xs font-black text-slate-800">{d.displayName} <span className="ml-1 text-[9px] text-slate-400 font-mono">({d.lineUserId.substring(0, 6)}...)</span></p>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{d.licensePlate} · {d.phone}</p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle size={16} className="text-blue-500" />
                        </div>
                      </button>
                    ))}
                  {approvedDrivers.length === 0 && (
                    <p className="text-center py-4 text-[11px] text-slate-400 font-bold">ไม่พบคนขับที่ได้รับอนุมัติแล้ว</p>
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
            </div>
          </section>

          {/* Driver Actions */}
          {isDriver && (
            <section className="mb-8 rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
              <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-blue-600">Driver Actions</h2>
              <div className="grid gap-3">
                <ActionButton icon={Play} label="เริ่มเดินทาง" disabled={currentStep > 0} loading={actionLoading === 'start_to_pickup'} onClick={() => patchTrip('start_to_pickup')} tone="blue" />
                <ActionButton icon={MapPin} label="ถึงจุดรับ" disabled={currentStep > 2} loading={actionLoading === 'arrive_pickup'} onClick={() => patchTrip('arrive_pickup')} tone="amber" />
                <ActionButton icon={Navigation} label="ออกไปจุดส่ง" disabled={currentStep > 3} loading={actionLoading === 'start_to_dropoff'} onClick={() => patchTrip('start_to_dropoff')} tone="blue" />
                <ActionButton icon={FileCheck} label="ส่งของสำเร็จ" disabled={currentStep > 4} loading={actionLoading === 'complete_delivery'} onClick={() => patchTrip('complete_delivery')} tone="emerald" />
                
                <button
                  type="button"
                  onClick={() => isTracking ? stopTracking() : startTracking()}
                  className={`mt-2 h-12 rounded-2xl border-2 px-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${
                    isTracking 
                      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {isTracking ? <Square size={16} /> : <LocateFixed size={16} />}
                  {isTracking ? 'หยุดส่ง GPS ชั่วคราว' : 'เริ่มส่ง GPS'}
                </button>
              </div>

              <div className="mt-5 border-t border-blue-100 pt-5">
                <button
                  type="button"
                  onClick={() => patchTrip('request_pod')}
                  disabled={actionLoading === 'request_pod'}
                  className="mb-3 h-12 w-full rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 text-sm font-black flex items-center justify-center gap-2 transition hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none"
                >
                  {actionLoading === 'request_pod' ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                  เปิดรับ POD ผ่าน LINE
                </button>
                <div className="flex gap-2">
                  <input
                    value={podUrl}
                    onChange={event => setPodUrl(event.target.value)}
                    placeholder="วางลิงก์ไฟล์ POD ที่นี่"
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  <button
                    type="button"
                    disabled={!podUrl || actionLoading === 'submit_pod_url'}
                    onClick={() => patchTrip('submit_pod_url', { podUrl })}
                    className="h-12 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Admin Tools */}
          {trip.access.canViewFinancials && trip.financials && (
            <section className="mb-8 rounded-3xl border border-violet-100 bg-violet-50/50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Banknote className="text-violet-600" size={18} />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-violet-600">ต้นทุนและกำไร (Admin Only)</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="ราคาตั้งต้น" value={formatMoney(trip.financials.basePrice)} tone="violet" />
                <Metric label="ค่ารถร่วม" value={formatMoney(trip.financials.driverPrice)} tone="amber" />
                <Metric label="ส่วนต่าง" value={formatMoney(trip.financials.platformFee)} tone="emerald" />
                <Metric label="Margin" value={trip.financials.grossMarginPercent !== null ? `${trip.financials.grossMarginPercent}%` : '-'} tone="blue" />
              </div>
            </section>
          )}
          
          {notice && (
            <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700 flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{notice}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon?: LucideIcon; label: string; value: string; tone: 'emerald' | 'blue' | 'amber' | 'violet' }) {
  const color = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    violet: 'text-violet-600 bg-violet-50 border-violet-100',
  }[tone];

  return (
    <div className={`rounded-2xl border p-3.5 ${color} flex flex-col justify-between`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
        {Icon && <Icon size={14} className="opacity-80" />}
      </div>
      <p className="truncate text-lg font-black">{value}</p>
    </div>
  );
}

function RoutePoint({ tone, label, title, time, contact, phone, onClick }: { tone: 'amber' | 'emerald'; label: string; title: string; time: string; contact?: string; phone?: string; onClick: () => void }) {
  const dot = tone === 'amber' ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div 
      onClick={onClick}
      className="flex gap-4 cursor-pointer group active:opacity-60 transition-opacity"
    >
      <div className="flex flex-col items-center">
        <span className={`mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${dot}`} />
        <div className="mt-1 h-full w-px bg-slate-200" />
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        </div>
        <p className="text-sm font-black leading-snug text-slate-800 group-hover:text-blue-600 transition-colors">
          {title}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500">{time}</p>
        {(contact || phone) && <p className="mt-1.5 text-[11px] font-bold text-slate-400">{contact || '-'} · {phone || '-'}</p>}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-black text-slate-800">{value}</span>
    </div>
  );
}

function ActionButton({ icon: Icon, label, disabled, loading, onClick, tone = 'blue' }: { icon: LucideIcon; label: string; disabled?: boolean; loading?: boolean; onClick: () => void; tone?: 'blue' | 'emerald' | 'amber' }) {
  const color = {
    blue: 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20',
    emerald: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20',
    amber: 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`h-12 rounded-2xl px-4 text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg ${color} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none`}
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : <Icon size={16} />}
      {label}
    </button>
  );
}
