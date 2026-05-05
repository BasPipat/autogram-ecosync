'use client';

import SidebarLayout from '@/components/SidebarLayout';
import React, { useEffect, useState, useMemo } from 'react';
import { Leaf, Truck, FileCheck, ArrowRight, Loader2, UploadCloud, X, CheckCircle, MapPin } from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

// Google Maps configuration
const containerStyle = {
  width: '100%',
  height: '600px',
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
    if (!podUrl) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/vault/upload-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: selectedTrip, podImageUrl: podUrl })
      });
      if (response.ok) {
        setIsModalOpen(false);
        fetchDashboardData();
      } else {
        alert("อัปโหลดไม่สำเร็จ");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenVerifyModal = async (tripId: string) => {
    setVerifyTripId(tripId);
    setIsVerifyModalOpen(true);
    setVerifyImageUrl('https://placehold.co/600x800/e2e8f0/64748b?text=POD+Document');
  };

  const handleVerifyPOD = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/vault/verify-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: verifyTripId })
      });
      if (response.ok) {
        setIsVerifyModalOpen(false);
        fetchDashboardData();
      } else {
        alert("อนุมัติไม่สำเร็จ");
      }
    } finally {
      setIsVerifying(false);
    }
  };

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
      <div className="min-h-screen bg-[#0a192f] p-8 font-sans">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white">Overview Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time Fleet & Carbon Tracking</p>
        </div>

        {/* Main Map Container with Floating Stats */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-8">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : defaultCenter}
              zoom={mapMarkers[0] ? 9 : 6}
              options={{ disableDefaultUI: true, zoomControl: true }}
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
                  <div className="text-sm bg-[#0a192f] text-slate-100 p-3 rounded-lg">
                    <p className="font-semibold text-white">{selectedMarker.tripId}</p>
                    <p className="text-slate-400 text-xs mt-1">{selectedMarker.locationName}</p>
                    <p className="mt-2 text-slate-200">Driver: <span className="text-[#10b981] font-medium">{selectedMarker.driverName}</span></p>
                    <p className="text-slate-200">Phone: {selectedMarker.driverPhone}</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="h-[600px] bg-[#112240] flex items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mr-2" /> Loading map...
            </div>
          )}

          {/* Floating Stats Panels */}
          <div className="absolute top-6 right-6 grid grid-cols-3 gap-3 pointer-events-none">
            <div className="bg-[#0a192f]/95 backdrop-blur-md p-4 rounded-xl border border-[#10b981]/20 shadow-lg">
              <p className="text-xs text-slate-400 font-medium">Carbon Emissions</p>
              <h3 className="text-2xl font-bold text-[#10b981] mt-1">{stats.totalCarbon}</h3>
              <p className="text-xs text-slate-500 mt-1">kgCO₂e</p>
            </div>
            <div className="bg-[#0a192f]/95 backdrop-blur-md p-4 rounded-xl border border-slate-400/20 shadow-lg">
              <p className="text-xs text-slate-400 font-medium">Active Trips</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{stats.totalTrips}</h3>
              <p className="text-xs text-slate-500 mt-1">trips</p>
            </div>
            <div className="bg-[#0a192f]/95 backdrop-blur-md p-4 rounded-xl border border-slate-400/20 shadow-lg">
              <p className="text-xs text-slate-400 font-medium">POD Verified</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{stats.verifiedPODs}</h3>
              <p className="text-xs text-slate-500 mt-1">verified</p>
            </div>
          </div>

          {/* Active vehicles badge */}
          <div className="absolute bottom-6 left-6 bg-[#10b981]/20 backdrop-blur-md border border-[#10b981]/40 text-[#10b981] px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            {mapMarkers.length} Active
          </div>
        </div>

        {/* Recent Trips Table */}
        <div className="rounded-xl border border-[#112240] bg-[#112240]/50 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-[#112240] flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Recent Trips</h3>
            <span className="text-xs text-slate-400">{trips.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="bg-[#0a192f] border-b border-[#112240]">
                  <th className="px-6 py-3 text-left font-medium text-slate-400">Trip ID</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-400">Route</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-400">Carbon</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-400">POD Status</th>
                  <th className="px-6 py-3 text-center font-medium text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No trips available</td></tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip.id} className="border-b border-[#112240] hover:bg-[#0a192f]/50 transition">
                      <td className="px-6 py-3 font-medium text-white">{trip.id}</td>
                      <td className="px-6 py-3">{trip.origin} → {trip.dest}</td>
                      <td className="px-6 py-3">{trip.carbon} kgCO₂e</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trip.status === 'Verified' ? 'bg-[#10b981]/20 text-[#10b981]' :
                          trip.status === 'Pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700/30 text-slate-300'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {trip.status === 'No POD' ? (
                          <button onClick={() => handleOpenModal(trip.id)} className="text-xs text-[#10b981] hover:text-[#d1fae5] font-medium">Upload</button>
                        ) : trip.status === 'Pending' ? (
                          <button onClick={() => handleOpenVerifyModal(trip.id)} className="text-xs text-amber-300 hover:text-amber-200 font-medium">Verify</button>
                        ) : (
                          <span className="text-xs text-[#10b981] font-medium flex items-center justify-center gap-1"><CheckCircle size={14} /> Done</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals remain the same - POD Upload Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#112240] rounded-xl p-6 w-full max-w-md shadow-2xl border border-[#1a334f]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><UploadCloud className="text-[#10b981]" /> Upload POD</h3>
              <div className="mb-4 border-2 border-dashed border-[#1a334f] rounded-lg p-6 text-center">
                {podUrl ? (
                  <img src={podUrl} alt="POD" className="max-h-48 mx-auto" />
                ) : (
                  <input type="file" accept="image/*" className="w-full cursor-pointer" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPodUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-[#1a334f]">Cancel</button>
                <button disabled={isUploading} onClick={handleUploadPOD} className="px-4 py-2 rounded-lg bg-[#10b981] text-[#0a192f] font-medium hover:bg-[#d1fae5] disabled:opacity-50">Upload</button>
              </div>
            </div>
          </div>
        )}

        {/* POD Verify Modal */}
        {isVerifyModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#112240] rounded-xl p-6 w-full max-w-lg shadow-2xl border border-[#1a334f]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Verify POD Document</h3>
                <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
              </div>
              <div className="bg-[#0a192f] rounded-lg p-4 mb-4 h-96 flex items-center justify-center">
                {verifyImageUrl ? (
                  <img src={verifyImageUrl} alt="POD" className="max-h-full max-w-full" />
                ) : <Loader2 className="animate-spin text-slate-400" />}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsVerifyModalOpen(false)} className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10">Reject</button>
                <button onClick={handleVerifyPOD} disabled={isVerifying} className="px-4 py-2 rounded-lg bg-[#10b981] text-[#0a192f] font-medium hover:bg-[#d1fae5] flex items-center gap-2 disabled:opacity-50">
                  {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
