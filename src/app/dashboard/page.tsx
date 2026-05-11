'use client';

import SidebarLayout from '@/components/SidebarLayout';
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Leaf, Truck, CheckCircle, Loader2, UploadCloud, AlertCircle, 
  Navigation, MapPin, Battery, Activity, ShieldCheck, Map as MapIcon,
  LocateFixed, Settings2
} from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { getPusherClient } from '@/lib/pusher';
import { ChevronDown, ChevronUp, Radio } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface TripData {
  id: string;
  origin: string;
  dest: string;
  carbon: string;
  status: 'Verified' | 'Pending' | 'No POD';
}

interface DashboardStats {
  totalTrips: number;
  totalCarbon: string;
  verifiedPODs: number; // This is now a percentage from API
}

interface StatusBreakdown {
  name: string;
  value: number;
  color: string;
}

interface CarbonChartPoint {
  name: string;
  carbon: number;
  status: string;
}

interface ActiveUnit {
  tripId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  lastUpdate: number;
  driverName: string;
  licensePlate: string;
}

interface CurrentPosition {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalTrips: 0, totalCarbon: "0.00", verifiedPODs: 0 });
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [carbonChart, setCarbonChart] = useState<CarbonChartPoint[]>([]);

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [podUrl, setPodUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTripId, setVerifyTripId] = useState('');
  const [verifyImageUrl, setVerifyImageUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Monitor states
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [activeUnits, setActiveUnits] = useState<Record<string, ActiveUnit>>({});
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['places'],
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();

      if (!data.error) {
        setStats(data.stats);
        setTrips(data.recentTrips || []);
        setStatusBreakdown(data.statusBreakdown || []);
        setCarbonChart(data.carbonChart || []);
        setFetchError(false);
      } else {
        setFetchError(true);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleOpenUploadModal = (tripId: string) => {
    setSelectedTripId(tripId);
    setPodUrl('');
    setIsUploadModalOpen(true);
  };

  const handleUploadPOD = async () => {
    if (!podUrl.trim()) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/vault/upload-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: selectedTripId, podUrl }), // API updated to handle podUrl
      });
      if (response.ok) {
        setIsUploadModalOpen(false);
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
    setVerifyImageUrl('');
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

  // --- Pusher Real-time Logic ---
  useEffect(() => {
    if (!isMapExpanded) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe('fleet-tracking');
    
    channel.bind('location-updated', (data: ActiveUnit) => {
      setActiveUnits(prev => ({
        ...prev,
        [data.tripId]: data
      }));
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('fleet-tracking');
    };
  }, [isMapExpanded]);

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
      unit: 'kgCO₂e Total',
      icon: Leaf,
      gradient: 'linear-gradient(135deg, #10B981, #059669)',
      iconBg: '#ECFDF5',
      accent: '#10B981'
    },
    {
      label: 'Active Logistics',
      value: stats.totalTrips,
      unit: 'Trips in Progress',
      icon: Truck,
      gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      iconBg: '#EFF6FF',
      accent: '#3B82F6'
    },
    {
      label: 'Operational Integrity',
      value: `${stats.verifiedPODs}%`,
      unit: 'POD Compliance',
      icon: CheckCircle,
      gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      iconBg: '#FFF7ED',
      accent: '#F59E0B'
    },
  ];

  return (
    <SidebarLayout>
      <div className="min-h-screen pb-10" style={{ background: 'var(--bg-base)' }}>
        {/* Top Header Section */}
        <div className="relative px-8 pt-10 pb-16 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--text-primary) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Executive Dashboard</h1>
              <p className="text-[14px] mt-2 font-medium opacity-60" style={{ color: 'var(--text-primary)' }}>
                Operational Intelligence & Sustainability Overview
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/50 border border-white/50 backdrop-blur-md shadow-sm">
              <div className={`w-2 h-2 rounded-full animate-pulse ${fetchError ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {fetchError ? 'System Offline' : 'System Live'}
              </span>
            </div>
          </div>
        </div>

        {/* Error State UI (UX-01) */}
        {fetchError && (
          <div className="px-8 mb-6">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700 animate-fade-in">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">Unable to fetch latest data. Showing cached information.</p>
              <button 
                onClick={() => fetchDashboardData()}
                className="ml-auto text-xs underline font-black uppercase tracking-tighter"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="px-8 -mt-10 grid md:grid-cols-3 gap-6 stagger">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="group relative overflow-hidden bg-white rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:scale-110 transition-transform duration-700" style={{ background: card.gradient }}></div>
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      {card.label}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black tracking-tighter text-slate-800">
                        {card.value}
                      </span>
                    </div>
                    <p className="text-[13px] mt-2 font-bold text-slate-500 opacity-60">
                      {card.unit}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform duration-500" style={{ background: card.iconBg }}>
                    <Icon size={24} style={{ color: card.accent }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- LIVE GPS TRACKING SECTION (NEW) --- */}
        <div className="px-8 mt-8 animate-fade-in">
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden transition-all duration-500">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${Object.keys(activeUnits).length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  <h3 className="text-lg font-black text-slate-800">Fleet Mission Control</h3>
                </div>
                <p className="text-[12px] font-medium text-slate-400">Real-time GPS tracking & route synchronization</p>
              </div>

              <button
                onClick={() => setIsMapExpanded(!isMapExpanded)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[13px] hover:bg-black transition-all shadow-lg shadow-slate-200"
              >
                {isMapExpanded ? <ChevronUp size={18} /> : <Radio size={18} className="animate-pulse" />}
                {isMapExpanded ? 'HIDE LIVE MONITOR' : 'SHOW LIVE MONITOR'}
              </button>
            </div>

            {isMapExpanded && (
              <div className="animate-fade-in">

                <div className="p-6 relative">
                  <div className="absolute top-10 left-10 z-10 flex flex-col gap-2 pointer-events-none">
                    {Object.keys(activeUnits).length > 0 && (
                      <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-emerald-100 shadow-xl flex items-center gap-3 animate-slide-up">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                          <Radio size={16} className="text-emerald-500 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Fleet</p>
                          <p className="text-sm font-black text-slate-800">
                            {Object.keys(activeUnits).length} <span className="text-[10px] text-slate-400">Active Units</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] overflow-hidden border border-slate-100 shadow-inner h-[400px] bg-slate-50 relative group">
                    {!isLoaded ? (
                      <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                        <Loader2 className="animate-spin text-emerald-500" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Warming Satellite Engines...</p>
                      </div>
                    ) : (
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={selectedUnitId ? { lat: activeUnits[selectedUnitId].lat, lng: activeUnits[selectedUnitId].lng } : { lat: 13.7563, lng: 100.5018 }}
                        zoom={10}
                        options={{
                          disableDefaultUI: true,
                          zoomControl: true,
                          styles: [
                            { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
                            { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
                            { featureType: "water", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
                            { featureType: "poi", stylers: [{ visibility: "off" }] }
                          ]
                        }}
                      >
                        {Object.values(activeUnits).map((unit) => (
                          <Marker
                            key={unit.tripId}
                            position={{ lat: unit.lat, lng: unit.lng }}
                            onClick={() => setSelectedUnitId(unit.tripId)}
                            icon={{
                              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                              fillColor: selectedUnitId === unit.tripId ? "#3B82F6" : "#10b981",
                              fillOpacity: 1,
                              strokeWeight: 4,
                              strokeColor: "#ffffff",
                              scale: 2.5,
                              anchor: (typeof window !== 'undefined' && window.google) ? new window.google.maps.Point(12, 22) : { x: 12, y: 22 } as any,
                            }}
                          />
                        ))}
                      </GoogleMap>
                    )}
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monitor Status</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${Object.keys(activeUnits).length > 0 ? 'bg-emerald-50 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">
                          {Object.keys(activeUnits).length > 0 ? 'Fleet Sync active' : 'Awaiting Signals'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selected Unit</p>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{selectedUnitId || 'None'}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Update</p>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">
                        {selectedUnitId && activeUnits[selectedUnitId] ? new Date(activeUnits[selectedUnitId].lastUpdate).toLocaleTimeString() : '--:--:--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {(statusBreakdown.length > 0 || carbonChart.length > 0) && (
          <div className="px-8 mt-6 grid md:grid-cols-2 gap-6 animate-fade-in">

            {/* Pie Chart — POD Status Breakdown */}
            <div className="bg-white rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1">POD Status</p>
              <p className="text-[11px] text-slate-300 mb-4">Proof of Delivery Breakdown</p>
              {statusBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} trips`, '']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #F1F5F9', fontSize: '12px', fontWeight: 700 }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-300 text-sm font-bold">No POD data yet</div>
              )}
            </div>

            {/* Bar Chart — Carbon per Trip */}
            <div className="bg-white rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1">Carbon per Trip</p>
              <p className="text-[11px] text-slate-300 mb-4">kgCO₂e — 5 Latest Trips</p>
              {carbonChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={carbonChart} margin={{ top: 5, right: 8, left: -24, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} kgCO₂e`, 'Carbon']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #F1F5F9', fontSize: '12px', fontWeight: 700 }}
                      cursor={{ fill: 'rgba(241,245,249,0.6)' }}
                    />
                    <Bar dataKey="carbon" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {carbonChart.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            entry.status === 'Verified' ? '#10B981' :
                            entry.status === 'Pending' ? '#F59E0B' :
                            '#94A3B8'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-300 text-sm font-bold">No trip data yet</div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity Feed */}
        <div className="px-8 mt-8 animate-fade-in">
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Operational Timeline</h3>
                <p className="text-[12px] font-medium text-slate-400">Latest logistics movements & carbon data</p>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">
                  {trips.length} Total Sessions
                </span>
              </div>
            </div>
            
            <div className="divide-y divide-slate-50">
              {trips.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Truck size={32} className="text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold text-sm">No activity recorded today</p>
                </div>
              ) : (
                trips.map((trip) => (
                  <div key={trip.id} className="group px-8 py-6 hover:bg-slate-50/50 transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                          trip.status === 'Verified' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 
                          trip.status === 'Pending' ? 'bg-orange-50 border-orange-100 text-orange-500' : 
                          'bg-slate-50 border-slate-100 text-slate-400'
                        }`}>
                          <Truck size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-[15px] text-slate-800">{trip.id}</p>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border ${
                              trip.status === 'Verified' ? 'bg-emerald-100/50 border-emerald-200 text-emerald-700' : 
                              trip.status === 'Pending' ? 'bg-orange-100/50 border-orange-200 text-orange-700' : 
                              'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              {trip.status}
                            </span>
                          </div>
                          <p className="text-[13px] font-bold text-slate-400">
                            {trip.origin} <span className="mx-1 text-slate-300">→</span> {trip.dest}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12">
                        <div className="text-right">
                          <p className="text-[14px] font-black text-slate-700">{trip.carbon} <span className="text-[10px] text-slate-400">kgCO₂e</span></p>
                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Carbon Impact</p>
                        </div>
                        
                        <div className="flex gap-2">
                          {trip.status === 'No POD' ? (
                            <button
                              onClick={() => handleOpenUploadModal(trip.id)}
                              className="px-5 py-2 rounded-xl text-[12px] font-black bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                            >
                              Upload POD
                            </button>
                          ) : trip.status === 'Pending' ? (
                            <button
                              onClick={() => handleOpenVerifyModal(trip.id)}
                              className="px-5 py-2 rounded-xl text-[12px] font-black bg-white border-2 border-orange-100 text-orange-600 hover:bg-orange-50 transition-all active:scale-95"
                            >
                              Verify Job
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600">
                              <CheckCircle size={14} />
                              <span className="text-[11px] font-black uppercase tracking-tighter">Approved</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="px-8 py-4 bg-slate-50/50 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Precision Calculated using Eco-Sync Standard v2.1</p>
            </div>
          </div>
        </div>

        {/* Refactored Modals */}
        <ConfirmModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSubmit={handleUploadPOD}
          title="Upload Evidence"
          label="Document Link (POD)"
          placeholder="Paste image link here..."
          value={podUrl}
          onChange={setPodUrl}
          loading={isUploading}
          submitLabel="Submit POD"
          submitIcon={UploadCloud}
        />

        <ConfirmModal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          onSubmit={handleVerifyPOD}
          title="Audit Verification"
          label="Confirmation Source URL"
          placeholder="Verify image link..."
          value={verifyImageUrl}
          onChange={setVerifyImageUrl}
          loading={isVerifying}
          submitLabel="Approve Work"
          submitIcon={CheckCircle}
          submitColor="bg-slate-900 hover:bg-black shadow-slate-200"
        />
      </div>
    </SidebarLayout>
  );
}
