"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import SidebarLayout from '@/components/SidebarLayout';
import { Loader2, Truck, Navigation, AlertCircle } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '1.5rem',
};

const center = {
  lat: 13.7563,
  lng: 100.5018
};

const mapDarkStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

interface TruckMarker {
  tripId: string;
  lat: number;
  lng: number;
  locationName: string;
  driverName: string;
  driverPhone: string;
}

export default function OverviewPage() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [markers, setMarkers] = useState<TruckMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<TruckMarker | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const fetchActiveTrucks = useCallback(async () => {
    try {
      const res = await fetch('/api/overview/active-trucks');
      if (!res.ok) throw new Error('Failed to fetch markers');
      const data = await res.json();
      setMarkers(data.markers || []);
      setFetchError(false);
    } catch (err) {
      console.error('Error fetching active trucks:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveTrucks();
    const interval = setInterval(fetchActiveTrucks, 15000); // Poll every 15s for live tracking
    return () => clearInterval(interval);
  }, [fetchActiveTrucks]);

  return (
    <SidebarLayout>
      <div className="min-h-screen p-8 transition-colors duration-500" style={{ background: 'var(--bg-base)' }}>
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xs font-black tracking-[0.2em] text-[#10b981] uppercase mb-2">Network Intelligence</h1>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Fleet Overview</h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">Real-time geospatial tracking of active logistics sessions.</p>
          </div>
          
          <div className="flex gap-3">
            <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Units:</span>
              <span className="text-sm font-black text-emerald-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {markers.length}
              </span>
            </div>
            
            <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Map Engine:</span>
              <span className="text-sm font-black text-blue-600 flex items-center gap-1">
                {isLoaded ? 'Online' : 'Initializing...'}
              </span>
            </div>
          </div>
        </div>

        {fetchError && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700 animate-fade-in">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">Error syncing with fleet data. Positions may be delayed.</p>
          </div>
        )}

        {/* Map Container */}
        <div className="bg-white rounded-[32px] shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-slate-100 p-3 relative overflow-hidden animate-fade-in">
          {!isLoaded ? (
            <div className="h-[600px] flex items-center justify-center text-slate-400 flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
              <p className="font-bold text-sm uppercase tracking-widest">Calibrating Satellite Feed...</p>
            </div>
          ) : loadError ? (
            <div className="h-[600px] flex items-center justify-center text-red-500 bg-red-50 rounded-3xl p-8 text-center">
              <div>
                <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-black text-lg">Google Maps Configuration Error</p>
                <p className="text-sm opacity-70 mt-2">Please verify your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] overflow-hidden shadow-inner">
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={10}
                options={{
                  styles: mapDarkStyle,
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                }}
              >
                {markers.map((marker) => (
                  <Marker
                    key={marker.tripId}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    onClick={() => setSelectedMarker(marker)}
                    icon={{
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                      fillColor: "#10b981",
                      fillOpacity: 1,
                      strokeWeight: 2,
                      strokeColor: "#ffffff",
                      scale: 2,
                      anchor: new google.maps.Point(12, 22),
                    }}
                  />
                ))}

                {selectedMarker && (
                  <InfoWindow
                    position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                        <Truck size={16} className="text-emerald-500" />
                        <span className="font-black text-slate-800">{selectedMarker.tripId}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Driver</span>
                          <span className="text-[12px] font-bold text-slate-700">{selectedMarker.driverName}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Current Location</span>
                          <span className="text-[11px] text-slate-600 leading-tight">{selectedMarker.locationName}</span>
                        </div>
                      </div>
                      <button 
                        className="w-full mt-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                        onClick={() => window.open(`https://www.google.com/maps?q=${selectedMarker.lat},${selectedMarker.lng}`, '_blank')}
                      >
                        <Navigation size={12} />
                        View on Maps
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </div>
          )}
        </div>

        {/* Legend / Status Footer */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-black uppercase tracking-tighter">In Progress</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 border border-slate-200 opacity-50">
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
            <span className="text-xs font-black uppercase tracking-tighter">Offline / Stopped</span>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}