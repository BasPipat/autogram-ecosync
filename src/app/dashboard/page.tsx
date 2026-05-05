'use client';

import SidebarLayout from '@/components/SidebarLayout';
import React, { useEffect, useState, useMemo } from 'react';
import { Leaf, Truck, FileCheck, ArrowRight, Loader2, UploadCloud, X, CheckCircle, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

// Google Maps configuration
const containerStyle = {
  width: '100%',
  height: '100vh',
};

const defaultCenter = { lat: 13.7563, lng: 100.5018 };

type ActiveMarker = {
  tripId: string;
  lat: number;
  lng: number;
  locationName: string;
  driverName: string;
  driverPhone: string;
};

export default function Dashboard() {
  const [stats, setStats] = useState({ totalTrips: 0, totalCarbon: "0.00", verifiedPODs: 0 });
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapMarkers, setMapMarkers] = useState<ActiveMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [podUrl, setPodUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTripId, setVerifyTripId] = useState('');
  const [verifyImageUrl, setVerifyImageUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTripPanelOpen, setIsTripPanelOpen] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const fetchDashboardData = () => {
    Promise.all([
      fetch('/api/dashboard').then(res => res.json()),
      fetch('/api/overview/active-trucks', { cache: 'no-store' }).then(res => res.json()),
    ])
      .then(([dashData, mapData]) => {
        if (!dashData.error) {
          setStats(dashData.stats);
          setTrips(dashData.recentTrips);
        }
        if (mapData.markers) {
          setMapMarkers(mapData.markers);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = (tripId: string) => {
    setSelectedTrip(tripId);
    setPodUrl('');
    setIsModalOpen(true);
  };

  const handleUploadPOD = async () => {
    if (!podUrl.trim()) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/vault/upload-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: selectedTrip, podUrl }),
      });
      if (response.ok) {
        setIsModalOpen(false);
        setPodUrl('');
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenVerifyModal = (tripId: string) => {
    setVerifyTripId(tripId);
    setIsVerifyModalOpen(true);
  };

  const handleVerifyPOD = async () => {
    if (!verifyImageUrl.trim()) return;
    setIsVerifying(true);
    try {
      const response = await fetch('/api/vault/verify-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: verifyTripId, imageUrl: verifyImageUrl }),
      });
      if (response.ok) {
        setIsVerifyModalOpen(false);
        setVerifyImageUrl('');
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const selectedMarker = useMemo(() => 
    mapMarkers.find(m => m.tripId === selectedMarkerId),
    [mapMarkers, selectedMarkerId]
  );

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center text-[#10b981]">
          <Loader2 className="animate-spin w-10 h-10" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="relative h-screen bg-[#0a192f] overflow-hidden">
        {/* Google Maps Background */}
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : defaultCenter}
            zoom={mapMarkers[0] ? 9 : 6}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              styles: [
                { elementType: 'geometry', stylers: [{ color: '#0a192f' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#0a192f' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
                {
                  featureType: 'administrative.locality',
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#d4af37' }]
                },
                {
                  featureType: 'poi',
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#d59563' }]
                },
                {
                  featureType: 'poi.park',
                  elementType: 'geometry',
                  stylers: [{ color: '#263c3f' }]
                },
                {
                  featureType: 'poi.park',
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#6b9a76' }]
                },
                {
                  featureType: 'road',
                  elementType: 'geometry',
                  stylers: [{ color: '#38414e' }]
                },
                {
                  featureType: 'road',
                  elementType: 'geometry.stroke',
                  stylers: [{ color: '#212a37' }]
                },
                {
                  featureType: 'road',
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#9ca5b3' }]
                },
                {
                  featureType: 'road.highway',
                  elementType: 'geometry',
                  stylers: [{ color: '#746855' }]
                },
                {
                  featureType: 'road.highway',
                  elementType: 'geometry.stroke',
                  stylers: [{ color: '#1f2835' }]
                },
                {
                  featureType: 'road.highway',
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#f3d19c' }]
                },
                {
                  featureType: 'transit',
                  elementType: 'geometry',
                  stylers: [{ color: '#2f3948' }]
                },
                {
                  featureType: 'transit.station',
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#d59563' }]
                },
                {
                  featureType: 'water',
                  elementType: 'geometry',
                  stylers: [{ color: '#17263c' }]
                },
                {
                  featureType: 'water',
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#515c6d' }]
                },
                {
                  featureType: 'water',
                  elementType: 'labels.text.stroke',
                  stylers: [{ color: '#17263c' }]
                }
              ]
            }}
          >
            {mapMarkers.map((marker) => (
              <Marker
                key={marker.tripId}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => setSelectedMarkerId(marker.tripId)}
              />
            ))}

            {selectedMarker && (
              <InfoWindow
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarkerId(null)}
              >
                <div className="text-sm bg-[#0a192f] text-slate-100 p-3 rounded-lg border border-[#10b981]/20">
                  <p className="font-semibold text-white">{selectedMarker.tripId}</p>
                  <p className="text-slate-400 text-xs mt-1">{selectedMarker.locationName}</p>
                  <p className="mt-2 text-slate-200">Driver: <span className="text-[#10b981] font-medium">{selectedMarker.driverName}</span></p>
                  <p className="text-slate-200">Phone: {selectedMarker.driverPhone}</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="h-screen bg-[#112240] flex items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Loading map...
          </div>
        )}

        {/* Floating Stats Panels */}
        <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-auto grid grid-cols-3 gap-3 pointer-events-none z-10">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
            <p className="text-xs text-slate-400 font-medium">Carbon Emissions</p>
            <h3 className="text-xl md:text-2xl font-bold text-[#10b981] mt-1">{stats.totalCarbon}</h3>
            <p className="text-xs text-slate-500 mt-1">kgCO₂e</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
            <p className="text-xs text-slate-400 font-medium">Active Trips</p>
            <h3 className="text-xl md:text-2xl font-bold text-slate-100 mt-1">{stats.totalTrips}</h3>
            <p className="text-xs text-slate-500 mt-1">trips</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
            <p className="text-xs text-slate-400 font-medium">POD Verified</p>
            <h3 className="text-xl md:text-2xl font-bold text-slate-100 mt-1">{stats.verifiedPODs}</h3>
            <p className="text-xs text-slate-500 mt-1">verified</p>
          </div>
        </div>

        {/* Upload POD Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a192f] border border-[#10b981]/20 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Upload POD</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">POD Image URL</label>
                  <input
                    type="url"
                    value={podUrl}
                    onChange={(e) => setPodUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#112240] border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-[#10b981] focus:outline-none"
                    placeholder="https://example.com/pod-image.jpg"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadPOD}
                    disabled={isUploading || !podUrl.trim()}
                    className="flex-1 px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verify POD Modal */}
        {isVerifyModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a192f] border border-[#10b981]/20 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Verify POD</h3>
                <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Verification Image URL</label>
                  <input
                    type="url"
                    value={verifyImageUrl}
                    onChange={(e) => setVerifyImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#112240] border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-[#10b981] focus:outline-none"
                    placeholder="https://example.com/verification-image.jpg"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsVerifyModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyPOD}
                    disabled={isVerifying || !verifyImageUrl.trim()}
                    className="flex-1 px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifying ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
