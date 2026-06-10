'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { 
  Building2, CreditCard, DollarSign, Loader2, CheckCircle2, FileText, 
  Calendar, Upload, AlertCircle, Eye, Check, X, ClipboardCheck, ArrowRight, ShieldAlert, Download, Copy
} from 'lucide-react';

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [billingAlert, setBillingAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Data State
  const [trips, setTrips] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  
  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'cash_billing' | 'credit_billing' | 'slip_approvals' | 'credit_management' | 'driver_payouts'>('cash_billing');
  const [cashSubFilter, setCashSubFilter] = useState<'unpaid' | 'pending' | 'paid'>('unpaid');

  // Selection state for batch actions
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [slipUrlInput, setSlipUrlInput] = useState('');
  
  // Modal for slip viewing
  const [viewingSlipUrl, setViewingSlipUrl] = useState<string | null>(null);

  // Admin Credit date setter inputs
  const [billingDate, setBillingDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const isSystemOwner = sessionRole === 'system_owner' || sessionRole === 'owner';

  // Automatically set initial active tab based on role and query params
  useEffect(() => {
    if (isSystemOwner) {
      const tabParam = searchParams.get('tab');
      if (tabParam === 'slip-approvals') setActiveTab('slip_approvals');
      else if (tabParam === 'credit-management') setActiveTab('credit_management');
      else setActiveTab('driver_payouts'); // Default: show driver payouts first (most urgent)
    } else {
      if (paymentType === 'credit') {
        setActiveTab('credit_billing');
      } else {
        setActiveTab('cash_billing');
      }
    }
  }, [isSystemOwner, searchParams, paymentType]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !session) {
      router.push('/');
      return;
    }
    
    fetchBillingData();
  }, [status, session, router]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/billing', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setTrips(data.trips || []);
        if (data.paymentType) {
          setPaymentType(data.paymentType);
        }
      } else {
        setBillingAlert({ type: 'error', message: data.error || 'ดึงข้อมูลไม่สำเร็จ' });
      }
    } catch {
      setBillingAlert({ type: 'error', message: 'ระบบขัดข้องขณะโหลดข้อมูลการเงิน' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrip = (id: string) => {
    setSelectedTripIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnpaidCash = (unpaidCashTrips: any[]) => {
    if (selectedTripIds.length === unpaidCashTrips.length) {
      setSelectedTripIds([]);
    } else {
      setSelectedTripIds(unpaidCashTrips.map(t => t._id));
    }
  };

  const handleCopyQRLink = () => {
    try {
      const absoluteUrl = window.location.origin + '/company-qr.jpg';
      navigator.clipboard.writeText(absoluteUrl);
      setBillingAlert({ type: 'success', message: 'คัดลอกลิงก์รูปภาพ QR Code สำเร็จ! คุณสามารถนำลิงก์นี้เปิดสแกนหรือส่งต่อได้เลย' });
    } catch {
      setBillingAlert({ type: 'error', message: 'ไม่สามารถคัดลอกลิงก์ได้โดยอัตโนมัติ กรุณากดปุ่มบันทึกรูปภาพเพื่อดาวน์โหลดรูปแทน' });
    }
  };

  const handleCopyAccountNumber = () => {
    try {
      navigator.clipboard.writeText('2163237698');
      setBillingAlert({ type: 'success', message: 'คัดลอกเลขบัญชี 216-3-23769-8 สำเร็จแล้ว! สามารถนำไปวางในแอปธนาคารเพื่อโอนเงินได้ทันที' });
    } catch {
      setBillingAlert({ type: 'error', message: 'ไม่สามารถคัดลอกได้อัตโนมัติ เลขบัญชีคือ 216-3-23769-8' });
    }
  };

  const handleRealSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBillingAlert(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      // PDF File Handler - read directly without drawing on canvas
      if (file.type === 'application/pdf') {
        setSlipUrlInput('');
        setBillingAlert({ type: 'error', message: 'ระบบอนุมัติอัตโนมัติผ่าน SlipOK รองรับเฉพาะรูปภาพสลิป กรุณาอัปโหลดเป็นรูปภาพจากแอปธนาคาร' });
        return;
      }

      // Image File Handler with Client-Side Compression
      const img = new Image();
      img.onerror = () => {
        setBillingAlert({ type: 'error', message: 'ไม่สามารถโหลดรูปภาพนี้ได้ กรุณาใช้รูปภาพอื่น' });
      };
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1024;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setSlipUrlInput(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            setSlipUrlInput(event.target?.result as string);
          }
          setBillingAlert({ type: 'success', message: 'เลือกรูปภาพสลิปสำเร็จแล้ว พร้อมส่งอนุมัติ!' });
        } catch {
          setSlipUrlInput(event.target?.result as string);
          setBillingAlert({ type: 'success', message: 'เลือกรูปภาพสลิปสำเร็จแล้ว พร้อมส่งอนุมัติ!' });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitCashSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setBillingAlert(null);

    if (selectedTripIds.length === 0) {
      setBillingAlert({ type: 'error', message: 'กรุณาเลือกรายการขนส่งอย่างน้อย 1 รายการเพื่อชำระเงิน' });
      return;
    }

    if (!slipUrlInput.trim()) {
      setBillingAlert({ type: 'error', message: 'กรุณาอัปโหลดรูปภาพสลิปการโอนเงินก่อนส่งอนุมัติ' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripIds: selectedTripIds,
          paymentSlipUrl: slipUrlInput
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBillingAlert({ type: 'success', message: data.message || 'ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว!' });
        setSelectedTripIds([]);
        setSlipUrlInput('');
        fetchBillingData();
      } else {
        setBillingAlert({ type: 'error', message: data.error || 'ส่งข้อมูลล้มเหลว' });
      }
    } catch {
      setBillingAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบหลังบ้าน' });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Actions
  const handleApproveBatch = async (batchId: string) => {
    if (!confirm(`ยืนยันการอนุมัติการชำระเงินสำหรับรหัสชุด ${batchId}? ระบบจะเปลี่ยนสถานะเป็นชำระเงินแล้วและปลดล็อกใบงานทั้งหมดในชุดนี้ทันที`)) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_batch',
          paymentBatchId: batchId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBillingAlert({ type: 'success', message: data.message });
        fetchBillingData();
      } else {
        setBillingAlert({ type: 'error', message: data.error });
      }
    } catch {
      setBillingAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการทำรายการ' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineBatch = async (batchId: string) => {
    if (!confirm(`ปฏิเสธสลิปการโอนเงินของชุด ${batchId}? สถานะงานทั้งหมดจะกลับไปเป็นค้างชำระเงิน`)) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline_batch',
          paymentBatchId: batchId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBillingAlert({ type: 'success', message: data.message });
        fetchBillingData();
      } else {
        setBillingAlert({ type: 'error', message: data.error });
      }
    } catch {
      setBillingAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการทำรายการ' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCreditBillingDates = async () => {
    if (selectedTripIds.length === 0) {
      alert('กรุณาเลือกงานเครดิตอย่างน้อย 1 รายการ');
      return;
    }
    if (!billingDate && !dueDate) {
      alert('กรุณากรอก วันวางบิล หรือ วันครบกำหนดชำระ');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_credit_dates',
          tripIds: selectedTripIds,
          billingDate: billingDate || undefined,
          paymentDueDate: dueDate || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBillingAlert({ type: 'success', message: 'ตั้งรอบบิลการเงินสำเร็จ' });
        setSelectedTripIds([]);
        setBillingDate('');
        setDueDate('');
        fetchBillingData();
      } else {
        setBillingAlert({ type: 'error', message: data.error });
      }
    } catch {
      setBillingAlert({ type: 'error', message: 'ระบบขัดข้อง' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCreditPaid = async () => {
    if (selectedTripIds.length === 0) {
      alert('กรุณาเลือกงานเครดิตอย่างน้อย 1 รายการ');
      return;
    }
    if (!confirm(`ยืนยันการรับเงินค่าระวางและปิดยอดชำระเงินสำหรับงานเครดิตที่เลือกทั้งหมด ${selectedTripIds.length} รายการ?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_credit_paid',
          tripIds: selectedTripIds
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBillingAlert({ type: 'success', message: 'บันทึกปิดยอดชำระเงินเรียบร้อยแล้ว' });
        setSelectedTripIds([]);
        fetchBillingData();
      } else {
        setBillingAlert({ type: 'error', message: data.error });
      }
    } catch {
      setBillingAlert({ type: 'error', message: 'ระบบขัดข้อง' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkDriverPayoutPaid = async (tripId: string, tripCode: string) => {
    if (!confirm(`ยืนยันว่า System Owner โอนเงินให้รถร่วมสำหรับงาน ${tripCode} เรียบร้อยแล้ว?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_driver_payout_paid',
          tripId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBillingAlert({ type: 'success', message: data.message || 'บันทึกจ่ายเงินรถร่วมเรียบร้อยแล้ว' });
        fetchBillingData();
      } else {
        setBillingAlert({ type: 'error', message: data.error || 'บันทึกจ่ายเงินรถร่วมไม่สำเร็จ' });
      }
    } catch {
      setBillingAlert({ type: 'error', message: 'ระบบขัดข้องขณะบันทึกจ่ายเงินรถร่วม' });
    } finally {
      setSubmitting(false);
    }
  };

  // Compute values for UI
  const tenantCashTrips = trips.filter(t => t.paymentType === 'cash');
  const tenantCreditTrips = trips.filter(t => t.paymentType === 'credit');

  const unpaidCashTrips = tenantCashTrips.filter(t => t.paymentStatus === 'unpaid');
  const pendingCashTrips = tenantCashTrips.filter(t => t.paymentStatus === 'pending_verification');
  const paidCashTrips = tenantCashTrips.filter(t => t.paymentStatus === 'paid');
  const driverPayoutTrips = trips.filter(t => 
    t.opsStatus === 'payment_requested' || t.lineAssignmentStatus === 'payment_requested'
  );
  const driverPayoutTotal = driverPayoutTrips.reduce((sum, t) => sum + (Number(t.acceptedFreightPrice) || 0), 0);

  const selectedTotalAmount = trips
    .filter(t => selectedTripIds.includes(t._id))
    .reduce((sum, t) => sum + (Number(t.acceptedFreightPrice) || 0), 0);

  // Group pending slips for Admin slip verification
  const pendingBatchesMap: Record<string, { companyName: string; slipUrl: string; trips: any[]; total: number }> = {};
  trips.forEach(t => {
    if (t.paymentType === 'cash' && t.paymentStatus === 'pending_verification' && t.paymentBatchId) {
      if (!pendingBatchesMap[t.paymentBatchId]) {
        pendingBatchesMap[t.paymentBatchId] = {
          companyName: t.companyName || t.customerName || 'ทั่วไป',
          slipUrl: t.paymentSlipUrl || '',
          trips: [],
          total: 0
        };
      }
      pendingBatchesMap[t.paymentBatchId].trips.push(t);
      pendingBatchesMap[t.paymentBatchId].total += Number(t.acceptedFreightPrice) || 0;
    }
  });
  const pendingBatches = Object.entries(pendingBatchesMap).map(([batchId, details]) => ({
    batchId,
    ...details
  }));

  if (loading && trips.length === 0) {
    return (
      <SidebarLayout>
        <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <div className="text-center">
            <Loader2 className="animate-spin text-slate-400 mb-4 mx-auto" size={32} />
            <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลบัญชีการเงิน...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-blue-100" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
                  <FileText className="text-blue-600" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Finance & Billing Hub</h1>
                  <p className="text-sm text-slate-500">ระบบควบคุมยอดหนี้ ยืนยันสลิปเงินสด และรอบชำระวางบิลสำหรับระบบ SHIF</p>
                </div>
              </div>
            </div>
            <div className="inline-flex gap-2 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-sm">
              {isSystemOwner ? (
                <>
                  <button 
                    onClick={() => { setActiveTab('slip_approvals'); setSelectedTripIds([]); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'slip_approvals' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    อนุมัติยอดเงินโอน ({pendingBatches.length})
                  </button>
                  <button 
                    onClick={() => { setActiveTab('driver_payouts'); setSelectedTripIds([]); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'driver_payouts' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    จ่ายเงินรถร่วม ({driverPayoutTrips.length})
                  </button>
                  <button 
                    onClick={() => { setActiveTab('credit_management'); setSelectedTripIds([]); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'credit_management' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    รอบวางบิลลูกค้าเครดิต
                  </button>
                </>
              ) : (
                <>
                  {paymentType === 'cash' ? (
                    <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white flex items-center">
                      <DollarSign size={14} className="inline mr-1" /> บิลลูกค้าเงินสด
                    </div>
                  ) : (
                    <div className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white flex items-center">
                      <CreditCard size={14} className="inline mr-1" /> รอบเครดิตเทอม
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {billingAlert && (
            <div className={`rounded-2xl px-5 py-4 text-sm font-medium flex items-center justify-between border ${billingAlert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <div className="flex items-center gap-2">
                {billingAlert.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
                {billingAlert.message}
              </div>
              <button onClick={() => setBillingAlert(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
          )}

          {isSystemOwner && driverPayoutTrips.length > 0 && activeTab !== 'driver_payouts' && (
            <div className="rounded-2xl px-5 py-4 bg-amber-50 border border-amber-200 text-amber-900 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold">มีงานรถร่วมรอ System Owner โอนเงิน {driverPayoutTrips.length} งาน</h3>
                  <p className="text-xs text-amber-800/80 mt-0.5">ยอดรวมที่ต้องโอนให้คนขับ ฿{driverPayoutTotal.toLocaleString()} กรุณาตรวจสอบและปิดยอดในแท็บจ่ายเงินรถร่วม</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('driver_payouts')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold transition-colors"
              >
                ไปหน้าจ่ายเงินรถร่วม <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ───────────────── TENANT: CASH BILLING WORKFLOW ───────────────── */}
          {!isSystemOwner && activeTab === 'cash_billing' && (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-4">
                
                {/* Cash subfilter tabs */}
                <div className="flex border-b border-slate-200">
                  <button 
                    onClick={() => { setCashSubFilter('unpaid'); setSelectedTripIds([]); }}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${cashSubFilter === 'unpaid' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    ค้างชำระ ({unpaidCashTrips.length})
                  </button>
                  <button 
                    onClick={() => { setCashSubFilter('pending'); setSelectedTripIds([]); }}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${cashSubFilter === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    รอตรวจสอบ ({pendingCashTrips.length})
                  </button>
                  <button 
                    onClick={() => { setCashSubFilter('paid'); setSelectedTripIds([]); }}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${cashSubFilter === 'paid' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    ชำระเงินแล้ว ({paidCashTrips.length})
                  </button>
                </div>

                {cashSubFilter === 'unpaid' && (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            <th className="p-4 w-10 text-center">
                              <input 
                                type="checkbox" 
                                checked={unpaidCashTrips.length > 0 && selectedTripIds.length === unpaidCashTrips.length}
                                onChange={() => handleSelectAllUnpaidCash(unpaidCashTrips)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </th>
                            <th className="p-4">รหัสงาน</th>
                            <th className="p-4">เส้นทาง</th>
                            <th className="p-4 text-right">ค่าจ้าง</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                          {unpaidCashTrips.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-12 text-center text-slate-400 italic font-medium">ไม่มีรายการค้างชำระเงินสด</td>
                            </tr>
                          ) : (
                            unpaidCashTrips.map(trip => (
                              <tr key={trip._id} className={`hover:bg-slate-50/50 transition-colors ${selectedTripIds.includes(trip._id) ? 'bg-blue-50/30' : ''}`}>
                                <td className="p-4 text-center">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedTripIds.includes(trip._id)}
                                    onChange={() => handleSelectTrip(trip._id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="p-4 font-mono font-bold text-slate-700">{trip.tripId}</td>
                                <td className="p-4">
                                  <div className="text-xs text-slate-600 font-medium">
                                    {trip.origin} <ArrowRight size={10} className="inline mx-1" /> {trip.destination}
                                  </div>
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-slate-700">
                                  ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3">
                      {unpaidCashTrips.length > 0 && (
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/60 mb-1">
                          <span className="text-xs font-bold text-slate-500">เลือกทั้งหมด ({unpaidCashTrips.length} งาน)</span>
                          <input 
                            type="checkbox" 
                            checked={unpaidCashTrips.length > 0 && selectedTripIds.length === unpaidCashTrips.length}
                            onChange={() => handleSelectAllUnpaidCash(unpaidCashTrips)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      {unpaidCashTrips.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-400 bg-white italic font-medium">
                          ไม่มีรายการค้างชำระเงินสด
                        </div>
                      ) : (
                        unpaidCashTrips.map(trip => (
                          <div 
                            key={trip._id} 
                            onClick={() => handleSelectTrip(trip._id)}
                            className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer ${selectedTripIds.includes(trip._id) ? 'border-blue-500 bg-blue-50/10 shadow-sm' : 'border-slate-200'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={selectedTripIds.includes(trip._id)}
                                  onChange={() => {}} 
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-mono font-bold text-slate-700 text-sm">{trip.tripId}</span>
                              </div>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <div className="flex items-start gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0"></span>
                                <span className="text-slate-600"><strong>ต้นทาง:</strong> {trip.origin}</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                                <span className="text-slate-600"><strong>ปลายทาง:</strong> {trip.destination}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {cashSubFilter === 'pending' && (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            <th className="p-4">รหัสงาน</th>
                            <th className="p-4">รหัสชุด (Batch)</th>
                            <th className="p-4">เส้นทาง</th>
                            <th className="p-4 text-center">หลักฐานสลิป</th>
                            <th className="p-4 text-right">ค่าจ้าง</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                          {pendingCashTrips.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-12 text-center text-slate-400 italic font-medium">ไม่มีรายการรอตรวจสอบ</td>
                            </tr>
                          ) : (
                            pendingCashTrips.map(trip => (
                              <tr key={trip._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-mono font-bold text-slate-700">{trip.tripId}</td>
                                <td className="p-4 font-mono text-xs text-slate-400">{trip.paymentBatchId || '-'}</td>
                                <td className="p-4">
                                  <div className="text-xs text-slate-500 font-medium">
                                    {trip.origin} → {trip.destination}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  {trip.paymentSlipUrl ? (
                                    <button 
                                      onClick={() => setViewingSlipUrl(trip.paymentSlipUrl)}
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                                    >
                                      <Eye size={12} /> ดูสลิป
                                    </button>
                                  ) : '-'}
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-slate-700">
                                  ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3">
                      {pendingCashTrips.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-400 bg-white italic font-medium">
                          ไม่มีรายการรอตรวจสอบ
                        </div>
                      ) : (
                        pendingCashTrips.map(trip => (
                          <div key={trip._id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                            <div className="flex justify-between items-start">
                              <span className="font-mono font-bold text-slate-700 text-sm">{trip.tripId}</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <div><strong>รหัสชุด:</strong> <span className="font-mono text-slate-700">{trip.paymentBatchId || '-'}</span></div>
                              <div><strong>ต้นทาง:</strong> {trip.origin}</div>
                              <div><strong>ปลายทาง:</strong> {trip.destination}</div>
                            </div>
                            {trip.paymentSlipUrl && (
                              <div className="pt-2 border-t border-slate-100 flex justify-end">
                                <button 
                                  onClick={() => setViewingSlipUrl(trip.paymentSlipUrl)}
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                                >
                                  <Eye size={12} /> ดูสลิปโอนเงิน
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {cashSubFilter === 'paid' && (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            <th className="p-4">รหัสงาน</th>
                            <th className="p-4">เส้นทาง</th>
                            <th className="p-4 text-center">สถานะสลิป</th>
                            <th className="p-4 text-right">ค่าจ้าง</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                          {paidCashTrips.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-12 text-center text-slate-400 italic font-medium">ยังไม่มีรายการที่ชำระเงินเรียบร้อยแล้ว</td>
                            </tr>
                          ) : (
                            paidCashTrips.map(trip => (
                              <tr key={trip._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-mono font-bold text-slate-700">{trip.tripId}</td>
                                <td className="p-4">
                                  <div className="text-xs text-slate-500 font-medium">
                                    {trip.origin} → {trip.destination}
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100">
                                    <CheckCircle2 size={12} /> อนุมัติสำเร็จ
                                  </span>
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-slate-700">
                                  ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3">
                      {paidCashTrips.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-400 bg-white italic font-medium">
                          ยังไม่มีรายการที่ชำระเงินเรียบร้อยแล้ว
                        </div>
                      ) : (
                        paidCashTrips.map(trip => (
                          <div key={trip._id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-mono font-bold text-slate-700 text-sm">{trip.tripId}</span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                              <div><strong>ต้นทาง:</strong> {trip.origin}</div>
                              <div><strong>ปลายทาง:</strong> {trip.destination}</div>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-[10px] text-slate-450 font-mono truncate max-w-[180px]">
                                {trip.paymentTransRef ? `Ref: ${trip.paymentTransRef}` : ''}
                              </span>
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100">
                                <CheckCircle2 size={12} /> อนุมัติสำเร็จ
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

              </div>

              {/* Cash Billing Payment Submission Sidebar */}
              <div className="space-y-4">
                <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-5">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">สรุปยอดชำระเงินรวม</h3>
                    <p className="text-xs text-slate-400 mt-0.5">เลือกงานที่ต้องการจ่ายเงินและแนบหลักฐานสลิปการโอน</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>จำนวนงานที่เลือก:</span>
                      <span className="font-bold text-slate-800">{selectedTripIds.length} รายการ</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-200/60 pt-3">
                      <span className="text-xs text-slate-600 font-bold">ยอดโอนเงินรวม:</span>
                      <span className="font-mono text-xl font-bold text-emerald-600">
                        ฿{selectedTotalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {cashSubFilter === 'unpaid' && (
                    <form onSubmit={handleSubmitCashSlip} className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500">หลักฐานการโอนเงิน (อัปโหลดรูปสลิป)</label>
                        
                        <div className="relative">
                          <input 
                            type="file"
                            accept="image/*"
                            id="slip-file-input"
                            className="hidden"
                            onChange={handleRealSlipUpload}
                          />
                          <label 
                            htmlFor="slip-file-input"
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                              slipUrlInput.startsWith('data:image/') 
                                ? 'border-emerald-300 bg-emerald-50/20' 
                                : 'border-slate-200 bg-slate-50/60 hover:border-blue-400'
                            }`}
                          >
                            {slipUrlInput.startsWith('data:image/') ? (
                              <>
                                <CheckCircle2 className="text-emerald-500 mb-1" size={24} />
                                <span className="text-xs font-bold text-emerald-700">อัปโหลดรูปภาพสลิปแล้ว</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">แตะเพื่อเปลี่ยนรูปสลิป</span>
                              </>
                            ) : (
                              <>
                                <Upload className="text-slate-400 mb-1" size={20} />
                                <span className="text-xs font-bold text-slate-700">แตะเพื่ออัปโหลดรูปสลิปเงิน</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">รองรับรูปภาพสลิปจากแอปธนาคาร</span>
                              </>
                            )}
                          </label>
                        </div>

                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-[9px] text-slate-400">ระบบจะตรวจสลิปกับ SlipOK และอนุมัติทันทีเมื่อยอดเงินตรง</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 shadow-lg shadow-blue-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                        {submitting ? 'กำลังตรวจสลิปกับ SlipOK...' : 'ส่งสลิปอนุมัติใบงาน'}
                      </button>
                    </form>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4 text-xs text-slate-500">
                    <div>
                      <span className="font-bold text-slate-700 block mb-2 text-center text-sm border-b border-slate-200 pb-1.5">ข้อมูลชำระเงิน</span>
                      
                      {/* PromptPay QR Code Display */}
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm mb-3">
                        <img 
                          src="/company-qr.jpg" 
                          alt="บจก.ออโตแกรม PromptPay QR Code" 
                          className="w-36 h-auto rounded-lg border border-slate-200/50 p-1"
                        />
                        <span className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          สแกนชำระผ่าน PromptPay (บจก.ออโตแกรม)
                        </span>

                        <div className="flex gap-2 mt-3 w-full justify-center">
                          <a 
                            href="/company-qr.jpg" 
                            download="shif-company-qr.jpg"
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-bold text-[10px] transition-all border border-blue-100 hover:bg-blue-100/50 flex-1 text-center"
                          >
                            <Download size={11} /> บันทึกรูป QR
                          </a>
                          <button
                            type="button"
                            onClick={handleCopyQRLink}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 font-bold text-[10px] transition-all border border-slate-200/60 hover:bg-slate-100/80 flex-1"
                          >
                            <Copy size={11} /> คัดลอกลิงก์
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 text-center mt-2 leading-relaxed">
                          💡 แตะค้างที่รูปภาพ หรือกดบันทึกรูปเพื่อเก็บเข้าเครื่องสำหรับนำไปสแกนในแอปธนาคาร
                        </p>
                      </div>

                      {/* Bank Details */}
                      <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                          <span>บัญชีธนาคาร</span>
                          <span className="text-emerald-600 font-bold">กสิกรไทย (KBANK)</span>
                        </div>
                        <div className="text-xs text-slate-800 font-bold flex justify-between items-center">
                          <span>เลขบัญชี:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-slate-900 tracking-wider">216-3-23769-8</span>
                            <button
                              type="button"
                              onClick={handleCopyAccountNumber}
                              className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 hover:text-blue-750 font-bold px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-100/50 cursor-pointer"
                              title="คัดลอกเลขบัญชี"
                            >
                              <Copy size={9} /> คัดลอก
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 flex justify-between">
                          <span>ชื่อบัญชี:</span>
                          <span className="font-bold text-slate-700">บจก.ออโตแกรม</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>สาขา:</span>
                          <span>หัวหมาก</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────── TENANT: CREDIT BILLING WORKFLOW ───────────────── */}
          {!isSystemOwner && activeTab === 'credit_billing' && (
            <>
              {/* Desktop View */}
              <div className="hidden md:block rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      <th className="p-4">รหัสงาน</th>
                      <th className="p-4">เส้นทาง</th>
                      <th className="p-4 text-center">รอบวันวางบิล</th>
                      <th className="p-4 text-center">กำหนดชำระ</th>
                      <th className="p-4 text-right">ค่าจ้าง</th>
                      <th className="p-4 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {tenantCreditTrips.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 italic font-medium">ยังไม่มีรายการขนส่งเครดิตในระบบ</td>
                      </tr>
                    ) : (
                      tenantCreditTrips.map(trip => (
                        <tr key={trip._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-700">{trip.tripId}</td>
                          <td className="p-4 text-xs text-slate-500 font-medium">
                            {trip.origin} → {trip.destination}
                          </td>
                          <td className="p-4 text-center font-bold text-xs text-slate-600">
                            {trip.billingDate ? new Date(trip.billingDate).toLocaleDateString('th-TH') : '-'}
                          </td>
                          <td className="p-4 text-center font-bold text-xs text-slate-600">
                            {trip.paymentDueDate ? new Date(trip.paymentDueDate).toLocaleDateString('th-TH') : '-'}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-slate-700">
                            ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            {trip.paymentStatus === 'paid' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded text-xs font-bold border border-emerald-100">
                                <CheckCircle2 size={12} /> ชำระเงินแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded text-xs font-bold border border-slate-100">
                                ค้างชำระ (Credit)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="block md:hidden space-y-3">
                {tenantCreditTrips.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-400 bg-white italic font-medium">
                    ยังไม่มีรายการขนส่งเครดิตในระบบ
                  </div>
                ) : (
                  tenantCreditTrips.map(trip => (
                    <div key={trip._id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-slate-700 text-sm">{trip.tripId}</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1.5">
                        <div><strong>ต้นทาง:</strong> {trip.origin}</div>
                        <div><strong>ปลายทาง:</strong> {trip.destination}</div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/60 mt-1">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">วันวางบิล</span>
                            <span className="font-bold text-xs text-slate-700">
                              {trip.billingDate ? new Date(trip.billingDate).toLocaleDateString('th-TH') : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">กำหนดชำระ</span>
                            <span className="font-bold text-xs text-slate-700">
                              {trip.paymentDueDate ? new Date(trip.paymentDueDate).toLocaleDateString('th-TH') : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        {trip.paymentStatus === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100">
                            <CheckCircle2 size={12} /> ชำระเงินแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-xs font-bold border border-slate-100">
                            ค้างชำระ (Credit)
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ───────────────── SYSTEM OWNER (ADMIN): DRIVER PAYOUTS ───────────────── */}
          {isSystemOwner && activeTab === 'driver_payouts' && (
            <div className="space-y-6">
              <div className="bg-amber-50 rounded-2xl p-4 text-xs font-semibold text-amber-800 flex flex-col gap-2 border border-amber-200 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-amber-600" size={16} />
                  <span>งานที่คนขับส่งเอกสารครบและกดขอรับเงินโอน รอ System Owner จ่ายเงินให้รถร่วม</span>
                </div>
                <span className="font-mono font-black text-amber-900">ยอดรอโอน ฿{driverPayoutTotal.toLocaleString()}</span>
              </div>

              {driverPayoutTrips.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 p-16 text-center text-slate-400 bg-white italic font-medium">
                  ไม่มีงานรถร่วมที่รอจ่ายเงินโอนขณะนี้
                </div>
              ) : (
                <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse hidden md:table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="p-4">รหัสงาน</th>
                        <th className="p-4">คนขับ / ทะเบียน</th>
                        <th className="p-4">เส้นทาง</th>
                        <th className="p-4 text-right">ยอดโอนคนขับ</th>
                        <th className="p-4 text-center">วันที่ขอเงิน</th>
                        <th className="p-4 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {driverPayoutTrips.map(trip => (
                        <tr key={trip._id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-700">{trip.tripId}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-700">{trip.driverName || 'ไม่ระบุคนขับ'}</div>
                            <div className="text-xs text-slate-400">{trip.licensePlate || '-'}{trip.tailLicensePlate ? ` / ${trip.tailLicensePlate}` : ''}</div>
                            {trip.bankAccountNumber ? (
                              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 w-fit">
                                <span className="uppercase">{trip.bankName || 'ธนาคาร'}:</span>
                                <span className="font-mono">{trip.bankAccountNumber}</span>
                                {trip.bankAccountName && <span className="text-slate-500">({trip.bankAccountName})</span>}
                              </div>
                            ) : (
                              <div className="mt-1 text-xs text-slate-400 italic">ไม่ได้ระบุบัญชีธนาคาร</div>
                            )}
                          </td>
                          <td className="p-4 text-xs text-slate-500 max-w-md">
                            <div className="font-medium text-slate-600">{trip.origin}</div>
                            <div className="text-slate-400">→ {trip.destination}</div>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-amber-700">฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}</td>
                          <td className="p-4 text-center text-xs font-bold text-slate-500">
                            {trip.paymentRequestedAt ? new Date(trip.paymentRequestedAt).toLocaleDateString('th-TH') : (trip.updatedAt ? new Date(trip.updatedAt).toLocaleDateString('th-TH') : '-')}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleMarkDriverPayoutPaid(trip._id, trip.tripId)}
                              disabled={submitting}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} /> โอนแล้ว
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="md:hidden divide-y divide-slate-100">
                    {driverPayoutTrips.map(trip => (
                      <div key={trip._id} className="p-4 space-y-3">
                        <div className="flex justify-between gap-3">
                          <div>
                            <div className="font-mono font-bold text-slate-800">{trip.tripId}</div>
                            <div className="text-xs font-bold text-slate-600 mt-1">{trip.driverName || 'ไม่ระบุคนขับ'}</div>
                            <div className="text-[11px] text-slate-400">{trip.licensePlate || '-'}{trip.tailLicensePlate ? ` / ${trip.tailLicensePlate}` : ''}</div>
                            {trip.bankAccountNumber ? (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 w-fit">
                                <span className="uppercase">{trip.bankName || 'ธนาคาร'}:</span>
                                <span className="font-mono">{trip.bankAccountNumber}</span>
                                {trip.bankAccountName && <span className="text-slate-500 font-normal">({trip.bankAccountName})</span>}
                              </div>
                            ) : (
                              <div className="mt-1 text-[11px] text-slate-400 italic">ไม่ได้ระบุบัญชีธนาคาร</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 font-bold">ยอดโอน</div>
                            <div className="font-mono font-black text-amber-700">฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500">
                          <div>{trip.origin}</div>
                          <div className="text-slate-400 mt-0.5">→ {trip.destination}</div>
                        </div>
                        <button
                          onClick={() => handleMarkDriverPayoutPaid(trip._id, trip.tripId)}
                          disabled={submitting}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} /> บันทึกว่าโอนเงินแล้ว
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────────────── SYSTEM OWNER (ADMIN): SLIP APPROVALS ───────────────── */}
          {isSystemOwner && activeTab === 'slip_approvals' && (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-2xl p-4 text-xs font-semibold text-slate-500 flex items-center gap-2 border border-slate-100">
                <ShieldAlert className="text-blue-500" size={16} /> 
                เฉพาะผู้ดูแลระบบหลัก (System Owner) สามารถเข้าถึงฟังก์ชันตรวจสอบอนุมัติการชำระเงินของลูกค้าเงินสดเพื่อปลดปล่อยใบงาน
              </div>

              {pendingBatches.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 p-16 text-center text-slate-400 bg-white italic font-medium">
                  ไม่มีรายการแนบสลิปที่รอการตรวจสอบชำระเงินสดขณะนี้
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {pendingBatches.map(batch => (
                    <div key={batch.batchId} className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-start">
                        <div>
                          <div className="text-xs text-slate-400 font-bold">รหัสการชำระเงินเงินสด (Batch ID)</div>
                          <div className="font-mono text-sm font-bold text-slate-700">{batch.batchId}</div>
                          <div className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded inline-block mt-2">
                            {batch.companyName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400 font-bold">ยอดโอนเงินรวม</div>
                          <div className="font-mono text-lg font-bold text-emerald-600">฿{batch.total.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="p-5 flex-1 space-y-4">
                        {/* Included Trips */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">รายการงานขนส่งในชุด:</span>
                          <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-50 pr-2">
                            {batch.trips.map(t => (
                              <div key={t._id} className="pt-1.5 first:pt-0 flex justify-between text-xs text-slate-600 font-medium">
                                <span>{t.tripId} ({t.origin} → {t.destination})</span>
                                <span className="font-bold text-slate-700">฿{Number(t.acceptedFreightPrice).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Slip Image preview */}
                        {batch.slipUrl && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">สลิปการชำระเงิน:</span>
                            <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center h-48 cursor-pointer" onClick={() => setViewingSlipUrl(batch.slipUrl)}>
                              <img src={batch.slipUrl} alt="Slip" className="max-h-full max-w-full object-contain" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                <Eye size={16} className="mr-1" /> ขยายดูรูปภาพสลิป
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                        <button
                          onClick={() => handleDeclineBatch(batch.batchId)}
                          disabled={submitting}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs py-3 transition-colors"
                        >
                          <X size={14} /> ปฏิเสธสลิป
                        </button>
                        <button
                          onClick={() => handleApproveBatch(batch.batchId)}
                          disabled={submitting}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 transition-colors shadow-md shadow-emerald-600/10"
                        >
                          <Check size={14} /> อนุมัติ & ปล่อยใบงาน
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───────────────── SYSTEM OWNER (ADMIN): CREDIT MANAGEMENT ───────────────── */}
          {isSystemOwner && activeTab === 'credit_management' && (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-4">
                
                <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="p-4 w-10 text-center">
                          <input 
                            type="checkbox"
                            checked={trips.filter(t => t.paymentType === 'credit' && t.paymentStatus !== 'paid').length > 0 && selectedTripIds.length === trips.filter(t => t.paymentType === 'credit' && t.paymentStatus !== 'paid').length}
                            onChange={() => {
                              const unpaidCredit = trips.filter(t => t.paymentType === 'credit' && t.paymentStatus !== 'paid');
                              if (selectedTripIds.length === unpaidCredit.length) {
                                setSelectedTripIds([]);
                              } else {
                                setSelectedTripIds(unpaidCredit.map(t => t._id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="p-4">บริษัทลูกค้า</th>
                        <th className="p-4">รหัสงาน</th>
                        <th className="p-4 text-center">วันวางบิล</th>
                        <th className="p-4 text-center">กำหนดชำระ</th>
                        <th className="p-4 text-right">ค่าจ้าง</th>
                        <th className="p-4 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {trips.filter(t => t.paymentType === 'credit').length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400 italic font-medium">ไม่มีรายงานขนส่งเครดิตในขณะนี้</td>
                        </tr>
                      ) : (
                        trips.filter(t => t.paymentType === 'credit').map(trip => (
                          <tr key={trip._id} className={`hover:bg-slate-50/50 transition-colors ${selectedTripIds.includes(trip._id) ? 'bg-blue-50/30' : ''}`}>
                            <td className="p-4 text-center">
                              {trip.paymentStatus !== 'paid' ? (
                                <input 
                                  type="checkbox" 
                                  checked={selectedTripIds.includes(trip._id)}
                                  onChange={() => handleSelectTrip(trip._id)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              ) : '-'}
                            </td>
                            <td className="p-4 font-bold text-slate-700">{trip.companyName || trip.customerName}</td>
                            <td className="p-4 font-mono text-xs text-slate-500">{trip.tripId}</td>
                            <td className="p-4 text-center font-bold text-xs text-slate-600">
                              {trip.billingDate ? new Date(trip.billingDate).toLocaleDateString('th-TH') : '-'}
                            </td>
                            <td className="p-4 text-center font-bold text-xs text-slate-600">
                              {trip.paymentDueDate ? new Date(trip.paymentDueDate).toLocaleDateString('th-TH') : '-'}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-slate-700">
                              ฿{Number(trip.acceptedFreightPrice || 0).toLocaleString()}
                            </td>
                            <td className="p-4 text-center">
                              {trip.paymentStatus === 'paid' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100">
                                  ชำระเงินแล้ว
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-xs font-bold border border-slate-100">
                                  ค้างชำระ (Credit)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Credit Scheduler tools */}
              <div className="space-y-4">
                <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">การจัดรอบการเงินเครดิต</h3>
                    <p className="text-xs text-slate-400 mt-0.5">ระบุวันที่ทำเอกสารวางบิลและวันกำหนดจ่ายให้ลูกค้าที่เลือกทั้งหมด</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>จำนวนงานที่เลือก:</span>
                      <span className="font-bold text-slate-800">{selectedTripIds.length} รายการ</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>รวมยอดเงินค่าวางบิล:</span>
                      <span className="font-bold text-slate-800">฿{selectedTotalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12} /> วันที่วางบิล (Billing Date)</label>
                      <input 
                        type="date"
                        value={billingDate}
                        onChange={(e) => setBillingDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Calendar size={12} /> วันครบกำหนดจ่าย (Due Date)</label>
                      <input 
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={handleSetCreditBillingDates}
                      disabled={submitting || selectedTripIds.length === 0 || (!billingDate && !dueDate)}
                      className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-3 disabled:opacity-50 transition-colors"
                    >
                      บันทึกรอบวันที่การเงิน
                    </button>
                    <button
                      onClick={handleMarkCreditPaid}
                      disabled={submitting || selectedTripIds.length === 0}
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 disabled:opacity-50 transition-colors"
                    >
                      บันทึกว่า "ชำระเงินแล้ว"
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Slip Viewer Modal */}
      {viewingSlipUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden p-6 shadow-2xl flex flex-col border border-slate-100 animate-scale-in">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm">หลักฐานการชำระเงิน (สลิป/เอกสาร PDF)</h3>
              <button 
                onClick={() => setViewingSlipUrl(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center h-96 border border-slate-200/80 p-2">
              {viewingSlipUrl.startsWith('data:application/pdf') || viewingSlipUrl.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4 text-center">
                  <FileText size={64} className="text-slate-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">ไฟล์หลักฐานการชำระเงิน PDF</p>
                    <p className="text-xs text-slate-400 mt-1">สามารถเปิดดูและดาวน์โหลดเอกสาร PDF เพื่อตรวจสอบได้</p>
                  </div>
                  <a
                    href={viewingSlipUrl}
                    download="payment-receipt.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-lg shadow-blue-600/10"
                  >
                    <Eye size={14} /> เปิด / ดาวน์โหลดไฟล์ PDF
                  </a>
                </div>
              ) : (
                <img src={viewingSlipUrl} alt="Slip Uploaded" className="max-h-full max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <Loader2 className="animate-spin text-slate-400 mb-4 mx-auto" size={32} />
          <p className="text-slate-500 font-medium">กำลังเตรียมข้อมูลระบบการเงิน...</p>
        </div>
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}
