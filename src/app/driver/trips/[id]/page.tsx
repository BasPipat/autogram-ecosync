'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { 
  Navigation, MapPin, Battery, Activity, ShieldCheck, 
  Loader2, AlertCircle, Truck, Play, Square, Info
} from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];

interface TripDetails {
  _id: string;
  tripId: string;
  origin: string;
  destination: string;
  weight: number;
  driverName: string;
  licensePlate: string;
  status: string;
}

interface CurrentPosition {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export default function DriverJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = use(params);
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastPosition, setLastPosition] = useState<CurrentPosition | null>(null);
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const fetchTripDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver/trips/${tripId}`);
      if (!res.ok) throw new Error('Job not found');
      const data = await res.json();
      setTrip(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripDetails();
  }, [fetchTripDetails]);

  // Tracking Logic (Migrated from Dashboard)
  const syncLocation = useCallback(async (pos: CurrentPosition) => {
    try {
      const res = await fetch('/api/trips/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          ...pos,
        }),
      });
      if (res.ok) {
        setLastSyncTime(Date.now());
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  }, [tripId]);

  const startTracking = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setPermissionError('Browser does not support geolocation');
      return;
    }

    try {
      // 1. Request Wake Lock
      if ('wakeLock' in navigator) {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          setWakeLock(lock);
        } catch (e) {
          console.warn('Wake Lock request failed');
        }
      }

      // 2. Start Geolocation Watch
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos: CurrentPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp,
          };
          setLastPosition(newPos);
          setPermissionError(null);

          // Throttling: Sync only if moved > 50m or 1 minute passed
          // For simplicity in driver mode, we'll sync every 30s or on significant move
          // Here we just use a 15s debounce for now
          const now = Date.now();
          if (now - lastSyncTime > 15000) {
            syncLocation(newPos);
          }
        },
        (err) => {
          console.error('Geo error:', err);
          if (err.code === 1) setPermissionError('Permission Denied');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

      setWatchId(id);
      setIsTracking(true);
    } catch (err) {
      console.error('Start tracking error:', err);
    }
  };

  const stopTracking = () => {
    if (typeof window !== 'undefined') {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (wakeLock) wakeLock.release();
      setWatchId(null);
      setWakeLock(null);
      setIsTracking(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (wakeLock) wakeLock.release();
      }
    };
  }, [watchId, wakeLock]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
        <p className="ml-3 font-bold tracking-widest uppercase text-xs">Loading Mission...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-xl font-bold mb-2">Job Error</h1>
          <p className="text-slate-400">{error || 'Job data not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Truck className="text-emerald-500" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">{trip.tripId}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {isTracking ? 'Mission Active' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Battery Sync</span>
             <Battery size={16} className={isTracking ? 'text-emerald-400' : 'text-slate-600'} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4">
        {/* Job Info Card */}
        <div className="bg-slate-900 rounded-[24px] p-5 border border-slate-800 shadow-xl">
           <div className="flex justify-between items-start mb-4">
              <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Deployment Details</h2>
              <span className="px-2 py-0.5 bg-slate-800 rounded text-[9px] font-bold text-slate-400">{trip.licensePlate}</span>
           </div>
           
           <div className="space-y-4">
              <div className="flex gap-4">
                 <div className="flex flex-col items-center py-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                    <div className="w-px flex-1 border-l border-dashed border-slate-700 my-1"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                 </div>
                 <div className="flex-1 space-y-4">
                    <div>
                       <span className="text-[9px] font-bold text-slate-500 uppercase">Origin</span>
                       <p className="text-sm font-bold leading-snug">{trip.origin}</p>
                    </div>
                    <div>
                       <span className="text-[9px] font-bold text-slate-500 uppercase">Destination</span>
                       <p className="text-sm font-bold leading-snug">{trip.destination}</p>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                 <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Payload</span>
                    <span className="text-lg font-black text-white">{trip.weight} <span className="text-xs font-bold text-slate-500">TON</span></span>
                 </div>
                 <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">CFO Integrity</span>
                    <span className="text-lg font-black text-emerald-500">100%</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Telemetry Monitor */}
        {isTracking && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
             <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-lg flex flex-col items-center justify-center gap-1">
                <Activity size={20} className="text-emerald-400 mb-1" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Speed</span>
                <span className="text-2xl font-black text-white">{Math.round((lastPosition?.speed || 0) * 3.6)} <span className="text-[10px] text-slate-500">km/h</span></span>
             </div>
             <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-lg flex flex-col items-center justify-center gap-1">
                <Navigation size={20} className="text-blue-400 mb-1" style={{ transform: `rotate(${lastPosition?.heading || 0}deg)` }} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Heading</span>
                <span className="text-2xl font-black text-white">{Math.round(lastPosition?.heading || 0)}°</span>
             </div>
          </div>
        )}

        {/* Live Map Preview (Driver View) */}
        <div className="flex-1 bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 relative shadow-2xl">
           {!isLoaded ? (
             <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                <Loader2 className="animate-spin text-slate-700" size={24} />
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Map Satellite Loading...</span>
             </div>
           ) : (
             <GoogleMap
               mapContainerStyle={{ width: '100%', height: '100%' }}
               center={lastPosition ? { lat: lastPosition.lat, lng: lastPosition.lng } : { lat: 13.7563, lng: 100.5018 }}
               zoom={15}
               options={{
                 disableDefaultUI: true,
                 styles: [
                   { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
                   { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
                   { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
                   { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
                 ]
               }}
             >
               {lastPosition && (
                 <Marker 
                   position={{ lat: lastPosition.lat, lng: lastPosition.lng }}
                   icon={{
                     path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
                     fillColor: "#10b981",
                     fillOpacity: 1,
                     strokeWeight: 2,
                     strokeColor: "#ffffff",
                     scale: 1.5,
                     rotation: lastPosition.heading || 0,
                     anchor: (typeof window !== 'undefined' && window.google) ? new window.google.maps.Point(12, 12) : { x: 12, y: 12 } as any
                   }}
                 />
               )}
             </GoogleMap>
           )}
           
           {permissionError && (
             <div className="absolute top-4 left-4 right-4 p-3 bg-red-500/90 backdrop-blur rounded-2xl flex items-center gap-3 text-white shadow-xl animate-bounce">
                <AlertCircle size={20} />
                <span className="text-xs font-bold">{permissionError}</span>
             </div>
           )}
        </div>
      </main>

      {/* Control Panel */}
      <footer className="p-6 bg-slate-900 border-t border-slate-800 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        {!isTracking ? (
          <button 
            onClick={startTracking}
            className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 rounded-3xl flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
               <Play className="text-white fill-white" size={20} />
            </div>
            <span className="text-lg font-black text-slate-950 uppercase tracking-widest">Start Mission Tracking</span>
          </button>
        ) : (
          <div className="flex gap-4">
             <button 
              disabled
              className="flex-1 h-16 bg-slate-800 rounded-3xl flex items-center justify-center gap-3 opacity-50"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-sm font-black text-emerald-500 uppercase tracking-widest">Tracking Live</span>
            </button>
            <button 
              onClick={stopTracking}
              className="w-16 h-16 bg-red-500/10 border border-red-500/20 hover:bg-red-500 rounded-3xl flex items-center justify-center transition-all active:scale-95 group"
            >
              <Square className="text-red-500 group-hover:text-white" size={24} />
            </button>
          </div>
        )}
        
        <div className="flex justify-center gap-6 mt-6">
           <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500/50" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Secure Link</span>
           </div>
           <div className="flex items-center gap-2">
              <Info size={14} className="text-slate-600" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Wake Lock ON</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
