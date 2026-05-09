'use client';

import SidebarLayout from '@/components/SidebarLayout';
import React, { useEffect, useState } from 'react';
import { Leaf, Truck, CheckCircle, Loader2, UploadCloud, X } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalTrips: 0, totalCarbon: "0.00", verifiedPODs: 0 });
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      const data = await response.json();

      if (!data.error) {
        setStats(data.stats);
        setTrips(data.recentTrips || []);
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
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">System Live</span>
            </div>
          </div>
        </div>

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
                              onClick={() => handleOpenModal(trip.id)}
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

        {/* Modals remain with improved styling */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-slate-900/40 backdrop-blur-md">
            <div className="w-full max-w-md p-8 bg-white rounded-[40px] shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Upload Evidence</h3>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-2xl text-slate-300 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Document Link (POD)</label>
                  <input
                    type="url"
                    value={podUrl}
                    onChange={(e) => setPodUrl(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl text-[14px] border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    placeholder="Paste image link here..."
                  />
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl text-[14px] font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all">Cancel</button>
                  <button
                    onClick={handleUploadPOD}
                    disabled={isUploading || !podUrl.trim()}
                    className="flex-2 px-6 py-4 rounded-2xl text-[14px] font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                    Submit POD
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verify Modal with improved styling */}
        {isVerifyModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-slate-900/40 backdrop-blur-md">
            <div className="w-full max-w-md p-8 bg-white rounded-[40px] shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Audit Verification</h3>
                <button onClick={() => setIsVerifyModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-2xl text-slate-300 transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Confirmation Source URL</label>
                  <input
                    type="url"
                    value={verifyImageUrl}
                    onChange={(e) => setVerifyImageUrl(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl text-[14px] border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    placeholder="Verify image link..."
                  />
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setIsVerifyModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl text-[14px] font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all">Cancel</button>
                  <button
                    onClick={handleVerifyPOD}
                    disabled={isVerifying || !verifyImageUrl.trim()}
                    className="flex-2 px-6 py-4 rounded-2xl text-[14px] font-black text-white bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                  >
                    {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    Approve Work
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
