'use client';

import SidebarLayout from '@/components/SidebarLayout';
import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Leaf, Truck, FileCheck, Loader2, UploadCloud, X, CheckCircle, TrendingUp, ArrowUpRight } from 'lucide-react';

const defaultCenter = { lat: 13.7563, lng: 100.5018 };

type ActiveMarker = {
  tripId: string;
  lat: number;
  lng: number;
  locationName: string;
  driverName: string;
  driverPhone: string;
};

// Lazy-loaded Map Component
function MapSection({ markers, hasKey }: { markers: ActiveMarker[]; hasKey: boolean }) {
  const { useJsApiLoader, GoogleMap, Marker, InfoWindow } = require('@react-google-maps/api');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const lightMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fafafa' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c0e8e8' }] },
  ];

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const selectedMarker = useMemo(() =>
    markers.find(m => m.tripId === selectedMarkerId),
    [markers, selectedMarkerId]
  );

  if (!hasKey) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: 'var(--border-light)', color: 'var(--text-tertiary)' }}
      >
        Map service unavailable
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="w-full h-full flex items-center justify-center gap-2"
        style={{ background: 'var(--border-light)', color: 'var(--text-tertiary)' }}
      >
        <Loader2 className="animate-spin" size={18} /> Loading map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : defaultCenter}
      zoom={markers[0] ? 9 : 6}
      options={{ disableDefaultUI: true, zoomControl: true, styles: lightMapStyle }}
    >
      {markers.map((marker: ActiveMarker) => (
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
          <div className="text-sm p-2">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedMarker.tripId}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{selectedMarker.locationName}</p>
            <p className="mt-2 text-sm">Driver: <span className="font-medium" style={{ color: 'var(--accent)' }}>{selectedMarker.driverName}</span></p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Phone: {selectedMarker.driverPhone}</p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export default function Dashboard() {
  const hasGoogleMapsKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [stats, setStats] = useState({ totalTrips: 0, totalCarbon: "0.00", verifiedPODs: 0 });
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapMarkers, setMapMarkers] = useState<ActiveMarker[]>([]);
  const [showMap, setShowMap] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [podUrl, setPodUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTripId, setVerifyTripId] = useState('');
  const [verifyImageUrl, setVerifyImageUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

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
        <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <div className="text-center animate-fade-in">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--accent-glow)' }}
            >
              <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Loading dashboard...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  const statCards = [
    {
      label: 'Carbon Emissions',
      value: stats.totalCarbon,
      unit: 'kgCO₂e',
      icon: Leaf,
      gradient: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
      iconColor: '#10B981',
    },
    {
      label: 'Active Trips',
      value: stats.totalTrips,
      unit: 'in progress',
      icon: Truck,
      gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
      iconColor: '#3B82F6',
    },
    {
      label: 'POD Verified',
      value: stats.verifiedPODs,
      unit: 'completed',
      icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
      iconColor: '#22C55E',
    },
  ];

  return (
    <SidebarLayout>
      <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-2 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            ภาพรวมการขนส่งและข้อมูลคาร์บอน
          </p>
        </div>

        {/* Map Toggle + Section */}
        <div className="px-6 mt-4">
          <button
            onClick={() => setShowMap(!showMap)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-200"
            style={{
              background: showMap ? 'var(--accent-glow)' : 'var(--bg-card)',
              color: showMap ? 'var(--accent)' : 'var(--text-secondary)',
              border: `1px solid ${showMap ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
            }}
          >
            <TrendingUp size={15} />
            {showMap ? 'ซ่อนแผนที่' : 'แสดงแผนที่ติดตาม'}
          </button>
        </div>

        {showMap && (
          <div className="px-6 mt-4 animate-fade-in">
            <div
              className="relative w-full overflow-hidden"
              style={{
                height: '360px',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <MapSection markers={mapMarkers} hasKey={hasGoogleMapsKey} />
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="px-6 mt-6 grid md:grid-cols-3 gap-4 stagger">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="glass-card p-5 cursor-default"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold mt-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {card.value}
                    </p>
                    <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      {card.unit}
                    </p>
                  </div>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: card.gradient }}
                  >
                    <Icon size={20} style={{ color: card.iconColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Trips */}
        <div className="px-6 mt-6 mb-8 animate-fade-in">
          <div className="card overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Recent Trips</h3>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--border-light)', color: 'var(--text-tertiary)' }}>
                {trips.length} trips
              </span>
            </div>
            <div>
              {trips.length === 0 ? (
                <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
                  <Truck size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No trips found</p>
                </div>
              ) : (
                trips.map((trip, i) => (
                  <div
                    key={trip.id}
                    className="px-6 py-4 transition-colors duration-150"
                    style={{
                      borderBottom: i < trips.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--border-light)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>{trip.id}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {trip.origin} → {trip.dest}
                        </p>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{
                          background: trip.status === 'Verified' ? '#ECFDF5' : trip.status === 'Pending' ? '#FFF7ED' : 'var(--border-light)',
                          color: trip.status === 'Verified' ? '#059669' : trip.status === 'Pending' ? '#C2410C' : 'var(--text-tertiary)',
                        }}
                      >
                        {trip.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {trip.carbon} kgCO₂e
                      </p>
                      <div className="flex gap-2">
                        {trip.status === 'No POD' ? (
                          <button
                            onClick={() => handleOpenModal(trip.id)}
                            className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                            style={{
                              background: 'var(--accent)',
                              color: '#fff',
                            }}
                          >
                            Upload POD
                          </button>
                        ) : trip.status === 'Pending' ? (
                          <button
                            onClick={() => handleOpenVerifyModal(trip.id)}
                            className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                            style={{ background: '#FFF7ED', color: '#C2410C' }}
                          >
                            Verify
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                            <CheckCircle size={12} /> Verified
                          </span>
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
          <div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
          >
            <div
              className="w-full max-w-md p-6 animate-fade-in"
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Upload POD</h3>
                <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-tertiary)' }}>
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>POD Image URL</label>
                  <input
                    type="url"
                    value={podUrl}
                    onChange={(e) => setPodUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none"
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-base)',
                    }}
                    placeholder="https://example.com/pod-image.jpg"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                    style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadPOD}
                    disabled={isUploading || !podUrl.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={15} /> : <UploadCloud size={15} />}
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verify POD Modal */}
        {isVerifyModalOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)' }}
          >
            <div
              className="w-full max-w-md p-6 animate-fade-in"
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Verify POD</h3>
                <button onClick={() => setIsVerifyModalOpen(false)} style={{ color: 'var(--text-tertiary)' }}>
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Verification Image URL</label>
                  <input
                    type="url"
                    value={verifyImageUrl}
                    onChange={(e) => setVerifyImageUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-[13px] outline-none"
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-base)',
                    }}
                    placeholder="https://example.com/verification-image.jpg"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setIsVerifyModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                    style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyPOD}
                    disabled={isVerifying || !verifyImageUrl.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {isVerifying ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle size={15} />}
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
