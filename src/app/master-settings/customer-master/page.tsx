'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Building2, Save, MapPin, Mail, Phone, Loader2, ShieldCheck, CheckCircle2, Edit2, Plus, X, CreditCard, DollarSign, Search, Trash2 } from 'lucide-react';

function isValidThaiTaxId(taxId: string): boolean {
  if (!taxId || taxId.length !== 13 || !/^\d{13}$/.test(taxId)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(taxId.charAt(i)) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(taxId.charAt(12));
}

export default function CustomerMasterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Single Profile Form (for Tenant view or Edit mode)
  const [form, setForm] = useState({
    id: '',
    taxId: '',
    companyName: '',
    address: '',
    email: '',
    phoneNumber: '',
    paymentType: 'cash',
    billingDay: '',
    paymentDay: '',
    creditDays: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const isSystemOwner = sessionRole === 'system_owner' || sessionRole === 'owner';

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !session) {
      router.push('/');
      return;
    }
    
    fetchProfile();
  }, [status, session, router]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master-settings/customers', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        if (data.profiles) {
          setProfiles(data.profiles);
        } else if (data.profile) {
          setForm({
            id: data.profile._id || '',
            taxId: data.profile.taxId || '',
            companyName: data.profile.companyName || '',
            address: data.profile.address || '',
            email: data.profile.email || '',
            phoneNumber: data.profile.phoneNumber || '',
            paymentType: data.profile.paymentType || 'cash',
            billingDay: data.profile.billingDay ?? '',
            paymentDay: data.profile.paymentDay ?? '',
            creditDays: data.profile.creditDays ?? ''
          });
        }
      } else {
        setAlert({ type: 'error', message: data.error || 'เกิดข้อผิดพลาดขณะดึงข้อมูล' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะโหลดข้อมูลโปรไฟล์' });
    } finally {
      setLoading(false);
    }
  };

  // Validate Tax ID format on blur or length 13
  useEffect(() => {
    const taxId = form.taxId.replace(/[^0-9]/g, '');
    if (taxId.length === 13) {
      if (!isValidThaiTaxId(taxId)) {
        setAlert({ type: 'error', message: 'เลขประจำตัวผู้เสียภาษี 13 หลัก ไม่ถูกต้องตามรูปแบบมาตรฐาน' });
      } else {
        if (alert?.message?.includes('ไม่ถูกต้อง')) setAlert(null);
      }
    } else if (alert?.message?.includes('ไม่ถูกต้อง')) {
      setAlert(null);
    }
  }, [form.taxId]);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setAlert(null);

    const taxId = form.taxId.replace(/[^0-9]/g, '');
    if (!isValidThaiTaxId(taxId)) {
      setAlert({ type: 'error', message: 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/master-settings/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id || undefined,
          taxId: form.taxId,
          companyName: form.companyName,
          address: form.address,
          email: form.email,
          phoneNumber: form.phoneNumber,
          paymentType: form.paymentType,
          billingDay: form.paymentType === 'credit' && form.billingDay !== '' ? parseInt(form.billingDay) : undefined,
          paymentDay: form.paymentType === 'credit' && form.paymentDay !== '' ? parseInt(form.paymentDay) : undefined,
          creditDays: form.paymentType === 'credit' && form.creditDays !== '' ? parseInt(form.creditDays) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: 'บันทึกข้อมูลโปรไฟล์บริษัทสำเร็จ' });
        setIsModalOpen(false);
        fetchProfile();
      } else {
        setAlert({ type: 'error', message: data.error || 'ไม่สามารถบันทึกข้อมูลได้' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะบันทึก' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (profile: any) => {
    setForm({
      id: profile._id,
      taxId: profile.taxId || '',
      companyName: profile.companyName || '',
      address: profile.address || '',
      email: profile.email || '',
      phoneNumber: profile.phoneNumber || '',
      paymentType: profile.paymentType || 'cash',
      billingDay: profile.billingDay ?? '',
      paymentDay: profile.paymentDay ?? '',
      creditDays: profile.creditDays ?? ''
    });
    setIsModalOpen(true);
    setAlert(null);
  };

    const handleCreateNewClick = () => {
    setForm({
      id: '',
      taxId: '',
      companyName: '',
      address: '',
      email: '',
      phoneNumber: '',
      paymentType: 'cash',
      billingDay: '',
      paymentDay: '',
      creditDays: ''
    });
    setIsModalOpen(true);
    setAlert(null);
  };

  const handleDeleteClick = async (profile: any) => {
    if (!confirm(`คุณต้องการลบข้อมูลบริษัท "${profile.companyName}" หรือไม่?\n(การกระทำนี้จะลบโปรไฟล์บริษัทออกจากระบบถาวร)`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/master-settings/customers?id=${profile._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: 'ลบข้อมูลบริษัทสำเร็จ' });
        fetchProfile();
      } else {
        setAlert({ type: 'error', message: data.error || 'ไม่สามารถลบข้อมูลได้' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.taxId?.includes(searchQuery)
  );

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <div className="text-center flex flex-col items-center">
             <Loader2 className="animate-spin text-slate-400 mb-4" size={32} />
             <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลโปรไฟล์...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
          
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100" style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' }}>
                  <Building2 className="text-emerald-600" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {isSystemOwner ? 'Customer Master Directory' : 'Company Profile'}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {isSystemOwner ? 'จัดการรายชื่อผู้ใช้บริษัทและประเภทธุรกรรมการเงิน' : 'จัดการข้อมูลโปรไฟล์บริษัทสำหรับการวางบิลและภาษี'}
                  </p>
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
               <ShieldCheck size={16} className="text-emerald-600" /> 
               {isSystemOwner ? 'ผู้ดูแลระบบควบคุมหลัก' : 'ข้อมูลส่วนตัวบริษัท'}
            </div>
          </div>

          {alert && !isModalOpen && (
            <div className={`rounded-2xl px-5 py-4 text-sm font-medium flex items-center gap-2 ${alert.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
              {alert.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600" />}
              {alert.message}
            </div>
          )}

          {isSystemOwner ? (
            /* ── System Owner View ── */
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อบริษัท หรือ Tax ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-medium"
                  />
                </div>
                <button
                  onClick={handleCreateNewClick}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 shadow-md shadow-emerald-600/10 transition-colors whitespace-nowrap self-stretch md:self-auto"
                >
                  <Plus size={16} /> ลงทะเบียนบริษัทใหม่
                </button>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      <th className="p-4">บริษัท</th>
                      <th className="p-4">Tax ID</th>
                      <th className="p-4">อีเมล / โทรศัพท์</th>
                      <th className="p-4">เงื่อนไขการเงิน</th>
                      <th className="p-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 italic">ไม่พบข้อมูลบริษัทในระบบ</td>
                      </tr>
                    ) : (
                      filteredProfiles.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-700">
                            {p.companyName}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-500">{p.taxId}</td>
                          <td className="p-4">
                            <div className="flex flex-col text-xs text-slate-500 gap-0.5">
                              {p.email && <span className="flex items-center gap-1"><Mail size={12} /> {p.email}</span>}
                              {p.phoneNumber && <span className="flex items-center gap-1"><Phone size={12} /> {p.phoneNumber}</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            {p.paymentType === 'cash' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                <DollarSign size={10} /> เงินสด (Cash)
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 self-start">
                                  <CreditCard size={10} /> เครดิต (Credit)
                                </span>
                                {(p.billingDay || p.paymentDay || p.creditDays) && (
                                  <div className="text-[10px] text-slate-400 font-medium pl-1">
                                    {p.billingDay && <div>วางบิลวันที่: {p.billingDay}</div>}
                                    {p.paymentDay && <div>ชำระเงินวันที่: {p.paymentDay}</div>}
                                    {p.creditDays && <div>เทอม: {p.creditDays} วัน</div>}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                                                    <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditClick(p)}
                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                title="แก้ไขข้อมูล"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(p)}
                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                title="ลบข้อมูล"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── Customer / Tenant View ── */
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
              <div className="mb-6 pb-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ข้อมูลนิติบุคคล</h2>
                  <p className="text-sm text-slate-500 mt-1">รายละเอียดสำหรับการออกเอกสารและใบเสร็จรับเงิน</p>
                </div>
                <div>
                  {form.paymentType === 'cash' ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                        <DollarSign size={12} /> ระบบชำระเงิน: เงินสด (Cash)
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">ชำระค่าระวางล่วงหน้าเพื่อสร้างใบงาน</p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        <CreditCard size={12} /> ระบบชำระเงิน: เครดิต (Credit)
                      </span>
                      {(form.billingDay || form.paymentDay || form.creditDays) ? (
                        <div className="text-[10px] text-slate-500 mt-1 space-y-0.5 font-medium">
                          {form.billingDay && <div>วันวางบิล: ทุกวันที่ {form.billingDay} ของเดือน</div>}
                          {form.paymentDay && <div>วันชำระเงิน: ทุกวันที่ {form.paymentDay} ของเดือน</div>}
                          {form.creditDays && <div>ระยะเวลาเครดิต: {form.creditDays} วัน</div>}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">ชำระเงินตามวันครบกำหนดรอบบิล</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                
                <div className="grid gap-6 md:grid-cols-2">
                  
                  <div className="md:col-span-2">
                     <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                       <span>ชื่อบริษัท (Company Name)</span>
                       <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">ไม่อนุญาตให้แก้ไข</span>
                     </label>
                     <input 
                       value={form.companyName || 'กำลังดึงข้อมูล...'} 
                       readOnly 
                       disabled
                       className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed outline-none" 
                     />
                  </div>

                  <div className="md:col-span-2">
                     <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                       <span>เลขประจำตัวผู้เสียภาษี (Tax ID)</span>
                       {form.taxId.length === 13 && isValidThaiTaxId(form.taxId.replace(/[^0-9]/g, '')) && (
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 size={12} /> ถูกต้อง
                          </span>
                       )}
                     </label>
                     <input 
                       value={form.taxId} 
                       required 
                       maxLength={13} 
                       onChange={(e) => setForm((prev) => ({ ...prev, taxId: e.target.value }))} 
                       className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-mono font-bold tracking-widest text-slate-700 transition-all" 
                       placeholder="0000000000000" 
                     />
                  </div>

                  <div className="md:col-span-2">
                     <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                       <MapPin size={16} className="text-slate-400" /> ที่อยู่ (Address)
                     </label>
                     <textarea 
                       value={form.address} 
                       rows={3}
                       onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} 
                       className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-700 transition-all resize-none" 
                       placeholder="บ้านเลขที่ อาคาร ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์ (สำหรับออกบิล)" 
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                       <Mail size={16} className="text-slate-400" /> อีเมลติดต่อ (Email)
                     </label>
                     <input 
                       type="email" 
                       value={form.email} 
                       onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} 
                       className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-700 transition-all" 
                       placeholder="billing@yourcompany.com" 
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                       <Phone size={16} className="text-slate-400" /> เบอร์โทรศัพท์ (Phone)
                     </label>
                     <input 
                       value={form.phoneNumber} 
                       onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} 
                       className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-slate-700 transition-all font-mono" 
                       placeholder="02-xxx-xxxx หรือ 08x-xxx-xxxx" 
                     />
                  </div>

                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                    {saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกโปรไฟล์บริษัท'}
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>
      </div>

      {/* ── System Owner Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-fade-in border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="text-emerald-600" size={18} />
                {form.id ? 'แก้ไขข้อมูลบริษัทนิติบุคคล' : 'ลงทะเบียนบริษัทลูกค้าใหม่'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {alert && (
              <div className="px-5 pt-4">
                <div className={`rounded-xl px-4 py-3 text-xs font-medium ${alert.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  {alert.message}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อบริษัท (Company Name)</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="บริษัท ตัวอย่าง จำกัด"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                <input
                  type="text"
                  required
                  maxLength={13}
                  value={form.taxId}
                  onChange={(e) => setForm(f => ({ ...f, taxId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono tracking-widest outline-none focus:border-emerald-500"
                  placeholder="01055xxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">เงื่อนไขการเงิน (Payment Term)</label>
                <select
                  value={form.paymentType}
                  onChange={(e) => setForm(f => ({ ...f, paymentType: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none bg-white font-bold text-slate-700 focus:border-emerald-500"
                >
                  <option value="credit">เครดิต (Credit Terms)</option>
                  <option value="cash">เงินสด (Cash / Pre-pay on booking)</option>
                </select>
              </div>

              {form.paymentType === 'credit' && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">วางบิลวันที่</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.billingDay}
                      onChange={(e) => setForm(f => ({ ...f, billingDay: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500 font-medium"
                      placeholder="เช่น 25"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">ชำระเงินวันที่</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.paymentDay}
                      onChange={(e) => setForm(f => ({ ...f, paymentDay: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500 font-medium"
                      placeholder="เช่น 5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">เครดิต (วัน)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.creditDays}
                      onChange={(e) => setForm(f => ({ ...f, creditDays: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500 font-medium"
                      placeholder="เช่น 30"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ที่อยู่ (Address)</label>
                <textarea
                  value={form.address}
                  rows={2}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none resize-none focus:border-emerald-500"
                  placeholder="ที่อยู่จดทะเบียนออกใบเสร็จ"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">อีเมลติดต่อ (Email)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    placeholder="mail@comp.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">เบอร์โทรศัพท์ (Phone)</label>
                  <input
                    type="text"
                    value={form.phoneNumber}
                    onChange={(e) => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/10 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
