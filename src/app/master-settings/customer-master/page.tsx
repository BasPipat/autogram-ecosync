'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Building2, Save, MapPin, Mail, Phone, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

function isValidThaiTaxId(taxId: string): boolean {
  if (!taxId || taxId.length !== 13 || !/^\d{13}$/.test(taxId)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(taxId.charAt(i)) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(taxId.charAt(12));
}

export default function CompanyProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    taxId: '',
    companyName: '',
    address: '',
    email: '',
    phoneNumber: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !session) {
      router.push('/');
      return;
    }
    
    // Set default company name from session
    if (session?.user?.name) {
       // Note: Depending on your session structure, the companyName might be stored in a specific property.
       // Here we rely on the backend to enforce the correct companyName.
    }
    fetchProfile();
  }, [status, session, router]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master-settings/customers', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.profile) {
        setForm({
          taxId: data.profile.taxId || '',
          companyName: data.profile.companyName || '',
          address: data.profile.address || '',
          email: data.profile.email || '',
          phoneNumber: data.profile.phoneNumber || ''
        });
      } else if (session?.user?.name) {
        // Fallback to name in session if no profile exists yet
        setForm(prev => ({ ...prev, companyName: (session as any).companyName || session.user?.name || '' }));
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะโหลดข้อมูลโปรไฟล์' });
    } finally {
      setLoading(false);
    }
  };

  // Tax ID check on blur or typing 13 digits
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
          taxId: form.taxId,
          address: form.address,
          email: form.email,
          phoneNumber: form.phoneNumber
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: 'อัปเดตข้อมูลโปรไฟล์บริษัทสำเร็จ' });
        if (data.profile) {
          setForm({
             taxId: data.profile.taxId || '',
             companyName: data.profile.companyName || '',
             address: data.profile.address || '',
             email: data.profile.email || '',
             phoneNumber: data.profile.phoneNumber || ''
          });
        }
      } else {
        setAlert({ type: 'error', message: data.error || 'ไม่สามารถบันทึกข้อมูลได้' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะบันทึก' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
          <div className="text-center flex flex-col items-center">
             <Loader2 className="animate-spin text-slate-400 mb-4" size={32} />
             <p className="text-slate-500 font-medium">กำลังโหลดโปรไฟล์บริษัท...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-100" style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' }}>
                  <Building2 className="text-emerald-600" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Company Profile</h1>
                  <p className="text-sm text-slate-500">จัดการข้อมูลโปรไฟล์บริษัท สำหรับการวางบิลและประวัติคาร์บอนเครดิต</p>
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
               <ShieldCheck size={16} className="text-emerald-600" /> ข้อมูลส่วนตัวบริษัท
            </div>
          </div>

          {alert && (
            <div className={`rounded-2xl px-5 py-4 text-sm font-medium flex items-center gap-2 ${alert.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
              {alert.type === 'success' && <CheckCircle2 size={18} className="text-emerald-600" />}
              {alert.message}
            </div>
          )}

          <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
            <div className="mb-6 pb-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">ข้อมูลนิติบุคคล</h2>
              <p className="text-sm text-slate-500 mt-1">รายละเอียดสำหรับการออกเอกสารและใบเสร็จรับเงิน</p>
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
                   <p className="text-xs text-slate-400 mt-2 ml-1">
                     หากมีการเปลี่ยนแปลงชื่อจดทะเบียนบริษัท กรุณาติดต่อ System Owner พร้อมแนบหนังสือรับรองบริษัท เพื่อขออนุมัติการแก้ไข
                   </p>
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

        </div>
      </div>
    </SidebarLayout>
  );
}
