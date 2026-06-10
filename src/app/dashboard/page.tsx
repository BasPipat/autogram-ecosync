'use client';

import SidebarLayout from '@/components/SidebarLayout';
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Leaf, Truck, CheckCircle, Loader2, UploadCloud, AlertCircle, 
  Navigation, MapPin, Battery, Activity, ShieldCheck, Map as MapIcon,
  LocateFixed, Settings2, Clock, User, ExternalLink
} from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { getPusherClient } from '@/lib/pusher';
import { ChevronDown, ChevronUp, Radio } from 'lucide-react';

const LIVE_STATUS_CONFIG: Record<string, { text: string; color: string; dot: string }> = {
  accepted:            { text: 'รับงานแล้ว',        color: 'blue',    dot: 'bg-blue-400' },
  en_route_pickup:     { text: 'ไปรับสินค้า',       color: 'orange',  dot: 'bg-orange-400' },
  arrived_pickup:      { text: 'ถึงจุดรับ',         color: 'amber',   dot: 'bg-amber-400' },
  en_route_dropoff:    { text: 'ไปส่งสินค้า',       color: 'indigo',  dot: 'bg-indigo-400' },
  delivered:           { text: 'ส่งของสำเร็จ',      color: 'green',   dot: 'bg-emerald-400' },
  documents_submitted: { text: 'ส่งเอกสารแล้ว',    color: 'emerald', dot: 'bg-teal-400' },
  payment_requested:   { text: 'รอจ่ายเงิน',        color: 'orange',  dot: 'bg-orange-500' },
  paid:                { text: 'จ่ายเงินแล้ว',      color: 'slate',   dot: 'bg-slate-400' },
};

function getStatusStep(opsStatus: string): number {
  const map: Record<string, number> = {
    accepted: 1, en_route_pickup: 2, arrived_pickup: 3,
    en_route_dropoff: 4, delivered: 5, documents_submitted: 5,
    payment_requested: 5, paid: 5,
  };
  return map[opsStatus] ?? 1;
}

function getTimeSince(dateString?: string) {
  if (!dateString) return '-';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'เมื่อกี้';
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ชม.ที่แล้ว`;
  return new Date(dateString).toLocaleDateString('th-TH');
}
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
  const [liveTrips, setLiveTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [carbonChart, setCarbonChart] = useState<CarbonChartPoint[]>([]);
  const [userRole, setUserRole] = useState<string>('');

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
  const [hoveredUnitId, setHoveredUnitId] = useState<string | null>(null);

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
        setLiveTrips(data.liveTrips || []);
        setStatusBreakdown(data.statusBreakdown || []);
        setCarbonChart(data.carbonChart || []);
        if (data.userRole) setUserRole(data.userRole);
        if (data.activeUnits) {
          // Merge with any real-time updates that might have arrived before fetch completed
          setActiveUnits(prev => ({ ...data.activeUnits, ...prev }));
        }
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
      label: 'Total Logistics',
      value: stats.totalTrips,
      unit: 'Total Trips in System',
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

        {/* Active Trips Status Panel — below charts */}
        <div className="px-8 mt-6 animate-fade-in">
          <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">สถานะงานในระบบ</h3>
                <p className="text-[12px] font-medium text-slate-400">ติดตามความคืบหน้างานที่กำลังดำเนินการอยู่</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100/50">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-tighter">
                  {liveTrips.length} งานดำเนินการอยู่
                </span>
              </div>
            </div>

            {liveTrips.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Truck size={24} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-sm">ไม่มีงานที่กำลังดำเนินการอยู่ในขณะนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                {liveTrips.map((trip: any) => {
                  // For client roles (corp_admin/coordinator), mask payment statuses
                  const isClientRole = userRole === 'corp_admin' || userRole === 'coordinator';
                  const displayStatus = (isClientRole && (trip.opsStatus === 'payment_requested' || trip.opsStatus === 'paid'))
                    ? 'job_done'
                    : trip.opsStatus;

                  const DONE_CFG = { text: 'จบงาน', color: 'emerald', dot: 'bg-emerald-400' };
                  const cfg = displayStatus === 'job_done'
                    ? DONE_CFG
                    : (LIVE_STATUS_CONFIG[trip.opsStatus] ?? { text: trip.opsStatus || 'กำลังดำเนินการ', color: 'slate', dot: 'bg-slate-400' });

                  const step = getStatusStep(trip.opsStatus);
                  const isPaymentUrgent = !isClientRole && trip.opsStatus === 'payment_requested';
                  const isDone = displayStatus === 'job_done';
                  const CardComponent = isDone ? 'div' : 'a';

                  return (
                    <CardComponent
                      key={trip._id}
                      {...(!isDone ? {
                        href: `/trips/${trip._id}`,
                        target: '_blank',
                        rel: 'noreferrer'
                      } : {})}
                      className={`relative flex flex-col justify-between rounded-2xl border p-5 ${
                        isDone 
                          ? 'border-slate-100 bg-white' 
                          : `transition-all duration-300 hover:shadow-lg hover:border-blue-200 hover:no-underline group ${
                              isPaymentUrgent ? 'border-orange-200 bg-orange-50/30' : 'border-slate-100 bg-white'
                            }`
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot}`} />
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
                          </span>
                          <span className="text-[12px] font-black text-slate-800 font-mono tracking-tighter">{trip.tripId}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          isPaymentUrgent ? 'bg-orange-100 text-orange-700' :
                          displayStatus === 'job_done' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {cfg.text}
                        </span>
                      </div>

                      {/* Company Badge — visible to internal roles only */}
                      {(userRole === 'system_owner' || userRole === 'owner') && (trip.companyName || trip.customerName) && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[9px] font-black text-violet-600 uppercase tracking-wider truncate max-w-full">
                            🏢 {trip.companyName || trip.customerName}
                          </span>
                        </div>
                      )}

                      {/* Driver */}
                      <div className="flex items-center gap-2 mb-3 bg-slate-50 px-3 py-2 rounded-xl">
                        <User size={12} className="text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-700 truncate">{trip.driverName || 'ไม่ระบุชื่อ'}</p>
                          <p className="text-[10px] font-bold text-slate-400 truncate">{trip.licensePlate || 'ไม่ระบุทะเบียน'}{trip.tailLicensePlate ? ` | ${trip.tailLicensePlate}` : ''}</p>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="space-y-1.5 mb-4 pl-3 border-l-2 border-dashed border-slate-200 ml-1">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Origin</p>
                          <p className="text-[11px] font-bold text-slate-600 truncate">{trip.origin}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase leading-none">Destination</p>
                          <p className="text-[11px] font-bold text-slate-600 truncate">{trip.destination}</p>
                        </div>
                      </div>

                      {/* Footer Progress */}
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-slate-400 font-bold">{getTimeSince(trip.gpsSession?.lastPingAt || trip.updatedAt)}</span>
                          <span className="text-[10px] text-slate-500 font-black">Step {step}/5</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPaymentUrgent ? 'bg-orange-400' : 'bg-blue-500'
                            }`}
                            style={{ width: `${(step / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {!isDone && (
                        <ExternalLink size={12} className="absolute top-4 right-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      )}
                    </CardComponent>
                  );
                })}
              </div>
            )}
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
