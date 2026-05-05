'use client';

import SidebarLayout from '@/components/SidebarLayout';
import React, { useEffect, useState, useMemo } from 'react';
import { Leaf, Truck, FileCheck, ArrowRight, Loader2, UploadCloud, X, CheckCircle, MapPin } from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

const defaultCenter = { lat: 13.7563, lng: 100.5018 };

type ActiveMarker = {
  tripId: string;
  lat: number;
  lng: number;
  locationName: string;
  driverName: string;
  driverPhone: string;
};

const lightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#fafafa' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c0e8e8' }]
  }
];

export default function Dashboard() {
  const hasGoogleMapsKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
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

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const fetchDashboardData = async () => {
    try {
      const [dashRes, mapRes] = await Promise.all([
        fetch('/api/dashboard', { cache: 'no-store' }),
        fetch('/api/overview/active-trucks', { cache: 'no-store' }),
      ]);
      
      const dashData = await dashRes.json();
      const mapData = await mapRes.json();
      
      if (!dashData.error) {
        setStats(dashData.stats);
        setTrips(dashData.recentTrips || []);
      }
      if (mapData.markers) {
        setMapMarkers(mapData.markers);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const selectedMarker = useMemo(() => 
    mapMarkers.find(m => m.tripId === selectedMarkerId),
    [mapMarkers, selectedMarkerId]
  );

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
        await fetchDashboardData();
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
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="h-screen flex items-center justify-center bg-[#F5F5F7]">
          <div className="text-center">
            <Loader2 className="animate-spin w-10 h-10 text-[#10b981] mx-auto mb-3" />
            <p className="text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#F5F5F7]">
        {/* Google Maps Section */}
        <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-md mx-4 mt-4 mb-6">
          {hasGoogleMapsKey && isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : defaultCenter}
              zoom={mapMarkers[0] ? 9 : 6}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                styles: lightMapStyle
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
                  <div className="text-sm bg-white p-3 rounded-lg shadow-lg">
                    <p className="font-semibold text-slate-900">{selectedMarker.tripId}</p>
                    <p className="text-slate-600 text-xs mt-1">{selectedMarker.locationName}</p>
                    <p className="mt-2 text-slate-700">Driver: <span className="text-[#10b981] font-medium">{selectedMarker.driverName}</span></p>
                    <p className="text-slate-700">Phone: {selectedMarker.driverPhone}</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500">
              {hasGoogleMapsKey ? <><Loader2 className="animate-spin mr-2" /> Loading map...</> : <span>Map service unavailable</span>}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="px-4 grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Carbon Emissions</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalCarbon}</p>
                <p className="text-xs text-slate-400 mt-1">kgCO₂e</p>
              </div>
              <Leaf className="text-[#10b981] opacity-20" size={48} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Active Trips</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalTrips}</p>
                <p className="text-xs text-slate-400 mt-1">in progress</p>
              </div>
              <Truck className="text-[#10b981] opacity-20" size={48} />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">POD Verified</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.verifiedPODs}</p>
                <p className="text-xs text-slate-400 mt-1">completed</p>
              </div>
              <CheckCircle className="text-[#10b981] opacity-20" size={48} />
            </div>
          </div>
        </div>

        {/* Recent Trips */}
        <div className="px-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Recent Trips</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {trips.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No trips found</div>
              ) : (
                trips.map((trip) => (
                  <div key={trip.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">{trip.id}</p>
                        <p className="text-sm text-slate-500">{trip.origin} → {trip.dest}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        trip.status === 'Verified' ? 'bg-[#10b981]/10 text-[#10b981]' :
                        trip.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {trip.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-600">{trip.carbon} kgCO₂e</p>
                      <div className="flex gap-2">
                        {trip.status === 'No POD' ? (
                          <button 
                            onClick={() => handleOpenModal(trip.id)} 
                            className="text-xs px-3 py-1 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-colors"
                          >
                            Upload POD
                          </button>
                        ) : trip.status === 'Pending' ? (
                          <button 
                            onClick={() => handleOpenVerifyModal(trip.id)} 
                            className="text-xs px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                          >
                            Verify
                          </button>
                        ) : (
                          <span className="text-xs text-[#10b981] font-medium">✓ Verified</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Upload POD Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Upload POD</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">POD Image URL</label>
                  <input
                    type="url"
                    value={podUrl}
                    onChange={(e) => setPodUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
                    placeholder="https://example.com/pod-image.jpg"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadPOD}
                    disabled={isUploading || !podUrl.trim()}
                    className="flex-1 px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
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
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Verify POD</h3>
                <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Verification Image URL</label>
                  <input
                    type="url"
                    value={verifyImageUrl}
                    onChange={(e) => setVerifyImageUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20"
                    placeholder="https://example.com/verification-image.jpg"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsVerifyModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyPOD}
                    disabled={isVerifying || !verifyImageUrl.trim()}
                    className="flex-1 px-4 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
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
