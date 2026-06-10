'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { 
  Truck, 
  MapPin, 
  ExternalLink, 
  Clock, 
  User, 
  CheckCircle2, 
  Navigation,
  AlertCircle,
  Phone,
  Search,
  Filter,
  Loader2,
  Package,
  Video,
  Image,
  BanknoteIcon,
} from 'lucide-react';

interface Trip {
  _id: string;
  tripId: string;
  driverName: string;
  licensePlate: string;
  origin: string;
  destination: string;
  opsStatus: string;
  lineAssignmentStatus: string;
  lastPingAt?: string;
  gpsSession?: {
    currentPin?: {
      address?: string;
    };
    lastPingAt?: string;
  };
  updatedAt: string;
  lineUserId?: string;
  status: string;
  podImageUrl?: string;
  podDocId?: string;
  videoDocId?: string;
  driverPhone?: string;
}

const STATUS_CONFIG: Record<string, { text: string; color: string; badge: string }> = {
  accepted:          { text: 'รับงานแล้ว',      color: 'blue',    badge: 'Active Trip' },
  en_route_pickup:   { text: 'กำลังไปรับของ',    color: 'orange',  badge: 'Active Trip' },
  arrived_pickup:    { text: 'ถึงจุดรับแล้ว',    color: 'amber',   badge: 'Active Trip' },
  en_route_dropoff:  { text: 'กำลังไปส่งของ',   color: 'indigo',  badge: 'Active Trip' },
  delivered:         { text: 'ส่งของแล้ว',       color: 'green',   badge: 'รอเอกสาร' },
  documents_submitted:{ text: 'ส่งเอกสารแล้ว',   color: 'emerald', badge: 'รอตรวจสอบ' },
  payment_requested: { text: 'ขอเงินโอน',        color: 'orange',  badge: '⚠️ ต้องโอนเงิน' },
  paid:              { text: 'ชำระเงินแล้ว',     color: 'slate',   badge: 'จบงาน' },
};

// Steps for the 5-dot progress bar (index 0-4)
const TIMELINE_STEPS = [
  { label: 'มอบหมาย', icon: CheckCircle2 },
  { label: 'ไปรับของ', icon: Navigation },
  { label: 'ถึงต้นทาง', icon: MapPin },
  { label: 'ไปส่งของ', icon: Navigation },
  { label: 'ส่งมอบ',   icon: CheckCircle2 },
];

function getStatusStep(opsStatus: string): number {
  const map: Record<string, number> = {
    accepted: 0,
    en_route_pickup: 1,
    arrived_pickup: 2,
    en_route_dropoff: 3,
    delivered: 4,
    documents_submitted: 4,
    payment_requested: 4,
    paid: 4,
  };
  return map[opsStatus] ?? 0;
}

function getTimeSince(dateString?: string) {
  if (!dateString) return 'ไม่มีข้อมูล';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'เมื่อครู่นี้';
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ชม.ที่แล้ว`;
  return new Date(dateString).toLocaleDateString('th-TH');
}

// Whether to show the evidence/verification section
function showEvidenceSection(trip: Trip): boolean {
  const evidenceStatuses = ['delivered', 'documents_submitted', 'payment_requested', 'paid'];
  return (
    evidenceStatuses.includes(trip.opsStatus) ||
    evidenceStatuses.includes(trip.lineAssignmentStatus) ||
    trip.status === 'Pending' ||
    trip.status === 'Verified' ||
    !!trip.podImageUrl ||
    !!trip.podDocId ||
    !!trip.videoDocId
  );
}

export default function ActiveTripsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      const res = await fetch('/api/admin/trips', { cache: 'no-store' });
      const allTrips = await res.json();
      const assigned = allTrips.filter((t: Trip) => t.lineUserId || t.licensePlate);
      
      // Sort trips:
      // 1. Active / Pending verification first (opsStatus !== 'paid')
      // 2. Chronological date descending within each group (newest first based on createdAt or scheduledOriginDate)
      assigned.sort((a: any, b: any) => {
        const aActive = a.opsStatus !== 'paid';
        const bActive = b.opsStatus !== 'paid';
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        const aTime = new Date(a.createdAt || a.scheduledOriginDate || 0).getTime();
        const bTime = new Date(b.createdAt || b.scheduledOriginDate || 0).getTime();
        return bTime - aTime;
      });

      setTrips(assigned);
    } catch (error) {
      console.error('Error fetching active trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTrip = async (tripId: string) => {
    if (!window.confirm(`คุณต้องการอนุมัติหลักฐานและจบงานสำหรับรหัสงาน ${tripId} ใช่หรือไม่?`)) return;
    setVerifyingId(tripId);
    try {
      const response = await fetch('/api/vault/verify-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      });
      if (response.ok) {
        await fetchTrips();
      } else {
        const data = await response.json();
        alert(data.error || 'เกิดข้อผิดพลาดในการอนุมัติ');
      }
    } catch (error) {
      console.error('Verify failed:', error);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return; }
    if (status === 'authenticated') {
      if (session?.user?.role !== 'system_owner') { router.push('/dashboard'); return; }
      fetchTrips();
    }
  }, [status, session, router]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchTrips, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredTrips = trips.filter(t =>
    t.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: trips.length,
    active: trips.filter(t => ['en_route_pickup', 'arrived_pickup', 'en_route_dropoff'].includes(t.opsStatus)).length,
    delivered: trips.filter(t => t.opsStatus === 'delivered').length,
    paymentPending: trips.filter(t => t.opsStatus === 'payment_requested').length,
    completed: trips.filter(t => ['documents_submitted', 'paid'].includes(t.opsStatus)).length,
  };

  return (
    <SidebarLayout>
      <div className="p-6 min-h-screen" style={{ background: 'var(--bg-base)' }}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Fleet Command Center</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">ติดตามงานแบบ Real-time</h1>
            <p className="text-sm text-slate-500">ตรวจสอบความคืบหน้าและตำแหน่งของรถขนส่งที่กำลังปฏิบัติงาน</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหารหัสงาน, คนขับ..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'งานทั้งหมด',   value: stats.total,          icon: Truck,         color: 'blue' },
            { label: 'กำลังวิ่ง',    value: stats.active,         icon: Navigation,    color: 'orange' },
            { label: 'ส่งของแล้ว',   value: stats.delivered,      icon: CheckCircle2,  color: 'green' },
            { label: 'รอโอนเงิน',    value: stats.paymentPending, icon: BanknoteIcon,  color: 'amber' },
            { label: 'จบงานแล้ว',    value: stats.completed,      icon: Clock,         color: 'slate' },
          ].map((stat, i) => (
            <div key={i} className="card p-4 flex items-center gap-4 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">{stat.label}</p>
                <p className="text-xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trip List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 text-sm animate-pulse">กำลังโหลดข้อมูลสถานะกองรถ...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="card p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-slate-300" size={32} />
              </div>
              <h3 className="text-slate-700 font-bold mb-1">ไม่พบงานที่กำลังดำเนินการ</h3>
              <p className="text-slate-400 text-sm">งานที่ยังไม่มีคนขับรับจะยังไม่แสดงในหน้านี้</p>
            </div>
          ) : (
            filteredTrips.map((trip, idx) => {
              const cfg = STATUS_CONFIG[trip.opsStatus] ?? { text: trip.opsStatus || 'รอดำเนินการ', color: 'slate', badge: 'รอดำเนินการ' };
              const step = getStatusStep(trip.opsStatus);
              const isPaymentUrgent = trip.opsStatus === 'payment_requested';

              return (
                <div
                  key={trip._id}
                  className={`card group hover:border-blue-200 transition-all duration-300 overflow-hidden animate-slide-in ${isPaymentUrgent ? 'border-orange-200 ring-1 ring-orange-100' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Left: Basic Info */}
                    <div className="p-5 lg:w-1/4 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          isPaymentUrgent
                            ? 'bg-orange-100 text-orange-700'
                            : trip.opsStatus === 'paid' || trip.status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {cfg.badge}
                        </span>
                        <a
                          href={`/trips/${trip._id}`}
                          target="_blank"
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="เปิด Digital Trip Hub"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      <h3 className="text-lg font-black text-slate-800 mb-1 font-mono tracking-tighter">{trip.tripId}</h3>

                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-700 leading-tight">{trip.driverName || 'ไม่ระบุชื่อ'}</p>
                          <p className="text-[11px] text-slate-500">{trip.licensePlate || 'ไม่ระบุทะเบียน'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`/trips/${trip._id}`}
                          target="_blank"
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors shadow-sm shadow-blue-200 text-center"
                        >
                          ดูบนแผนที่
                        </a>
                        {trip.driverPhone && (
                          <a
                            href={`tel:${trip.driverPhone}`}
                            className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Middle: Progress & Route */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="flex flex-col md:flex-row gap-6 mb-6">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="mt-1 w-2 h-2 rounded-full bg-orange-400 ring-4 ring-orange-50 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">ต้นทาง (Origin)</p>
                              <p className="text-xs font-bold text-slate-700 line-clamp-1">{trip.origin}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="mt-1 w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-50 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">ปลายทาง (Destination)</p>
                              <p className="text-xs font-bold text-slate-700 line-clamp-1">{trip.destination}</p>
                            </div>
                          </div>
                        </div>

                        <div className="md:w-1/3 flex flex-col items-end">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border border-${cfg.color}-100 bg-${cfg.color}-50 text-${cfg.color}-700 mb-2`}>
                            {cfg.text}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock size={12} />
                            <span>อัปเดต: {getTimeSince(trip.gpsSession?.lastPingAt || trip.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Stepper — capped at 4 steps (0-4) */}
                      <div className="relative pt-4 pb-2">
                        <div className="absolute top-7 left-0 right-0 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                            style={{ width: `${(step / 4) * 100}%` }}
                          />
                        </div>
                        <div className="relative flex justify-between">
                          {TIMELINE_STEPS.map((s, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${i <= step ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'bg-white border-2 border-slate-100 text-slate-300'}`}>
                                <s.icon size={12} strokeWidth={3} />
                              </div>
                              <span className={`text-[9px] font-bold uppercase ${i <= step ? 'text-blue-600' : 'text-slate-300'}`}>
                                {s.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: GPS */}
                    <div className="p-5 lg:w-1/4 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">ตำแหน่งล่าสุด (Current Location)</p>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-blue-500 mt-0.5" />
                          <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-relaxed">
                            {trip.gpsSession?.currentPin?.address || 'ไม่สามารถระบุพิกัดได้'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Evidence & Verification Section */}
                  {showEvidenceSection(trip) && (
                    <div className={`border-t px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${isPaymentUrgent ? 'bg-orange-50/60 border-orange-100' : 'bg-slate-50/50 border-slate-100'}`}>
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">หลักฐานการส่งงาน:</span>

                        {/* POD */}
                        {trip.podDocId ? (
                          <a
                            href={`/api/admin/line-driver-documents/${trip.podDocId}/content`}
                            target="_blank"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 text-[12px] font-bold text-slate-600 transition-all shadow-sm"
                          >
                            <Image size={14} className="text-emerald-500" />
                            <span>รูป POD (LINE)</span>
                            <ExternalLink size={11} className="text-slate-400" />
                          </a>
                        ) : trip.podImageUrl && !trip.podImageUrl.startsWith('line-message:') ? (
                          <a
                            href={trip.podImageUrl}
                            target="_blank"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 text-[12px] font-bold text-slate-600 transition-all shadow-sm"
                          >
                            <Image size={14} className="text-emerald-500" />
                            <span>รูป POD (URL)</span>
                            <ExternalLink size={11} className="text-slate-400" />
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 italic">
                            <Package size={12} />
                            ยังไม่มีรูปภาพ POD
                          </span>
                        )}

                        {/* VDO */}
                        {trip.videoDocId ? (
                          <a
                            href={`/api/admin/line-driver-documents/${trip.videoDocId}/content`}
                            target="_blank"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-[12px] font-bold text-slate-600 transition-all shadow-sm"
                          >
                            <Video size={14} className="text-blue-500" />
                            <span>วิดีโอ VDO (LINE)</span>
                            <ExternalLink size={11} className="text-slate-400" />
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 italic">
                            <Video size={12} />
                            ยังไม่มีไฟล์วิดีโอ
                          </span>
                        )}
                      </div>

                      {/* Verify Button */}
                      <div className="flex items-center gap-2">
                        {trip.status === 'Verified' ? (
                          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                            <CheckCircle2 size={14} className="stroke-[3]" />
                            <span className="text-[12px] font-black uppercase tracking-tight">อนุมัติงานเรียบร้อย</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleVerifyTrip(trip.tripId)}
                            disabled={verifyingId === trip.tripId}
                            className={`px-5 py-2 text-white rounded-xl text-[12px] font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 ${
                              isPaymentUrgent
                                ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                            }`}
                          >
                            {verifyingId === trip.tripId ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} className="stroke-[3]" />
                            )}
                            อนุมัติงาน (Verify)
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
