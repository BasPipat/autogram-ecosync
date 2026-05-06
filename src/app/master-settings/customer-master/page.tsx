'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Download, Upload, Search, Plus, FileText, Building2, User, Phone, Mail, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

const FIELD_HEADERS = [
  { key: 'taxId', label: 'taxId (13 digits)' },
  { key: 'companyName', label: 'companyName' },
  { key: 'address', label: 'address' },
  { key: 'email', label: 'email' },
  { key: 'phoneNumber', label: 'phoneNumber' },
  { key: 'companyId', label: 'companyId (optional for System Owner)' },
];

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
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ taxId: '', companyName: '', address: '', email: '', phoneNumber: '' });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    fetchCustomers();
  }, [status, router]);

  // Effect สำหรับ Auto-fill Tax ID 13 หลัก
  useEffect(() => {
    const taxId = newCustomer.taxId.replace(/[^0-9]/g, '');
    if (taxId.length === 13) {
      if (isValidThaiTaxId(taxId)) {
        lookupTaxId(taxId);
      } else {
        setAlert({ type: 'error', message: 'เลขประจำตัวผู้เสียภาษี 13 หลัก ไม่ถูกต้องตามรูปแบบมาตรฐาน' });
      }
    } else if (alert?.message?.includes('ไม่ถูกต้องตามรูปแบบมาตรฐาน')) {
      setAlert(null); // Clear alert when backspacing
    }
  }, [newCustomer.taxId]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master-settings/customers', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      } else {
        setAlert({ type: 'error', message: data.error || 'ไม่สามารถโหลดข้อมูลลูกค้าได้' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะโหลดข้อมูล' });
    } finally {
      setLoading(false);
    }
  };

  const lookupTaxId = async (taxId: string) => {
    if (isLookingUp) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(`/api/customers/lookup/${taxId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.companyName) {
           setNewCustomer(prev => ({
             ...prev,
             companyName: data.companyName || prev.companyName,
             address: data.address || prev.address
           }));
           setAlert({ type: 'success', message: 'ดึงข้อมูลสำเร็จจากฐานข้อมูลส่วนกลาง' });
        }
      }
    } catch (error) {
      console.error('Lookup failed', error);
    } finally {
      setIsLookingUp(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    return customers.filter((item) =>
      [item.taxId, item.companyName, item.email, item.phoneNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([{ taxId: '', companyName: '', address: '', email: '', phoneNumber: '', companyId: '' }], { header: FIELD_HEADERS.map((item) => item.label) });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CustomerTemplate');
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'customer-master-template.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parseExcelFile = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const normalized = rows.map((row) => ({
      taxId: String(row.taxId || row['taxId'] || row['เลขประจำตัวผู้เสียภาษี'] || row['Tax ID'] || ''),
      companyName: String(row.companyName || row['companyName'] || row['ชื่อบริษัท'] || row['Company Name'] || ''),
      address: String(row.address || row['address'] || row['ที่อยู่'] || row['Address'] || ''),
      email: String(row.email || row['email'] || row['อีเมล'] || row['Email'] || ''),
      phoneNumber: String(row.phoneNumber || row['phoneNumber'] || row['เบอร์โทรศัพท์'] || row['Phone Number'] || row['Phone'] || ''),
      companyId: String(row.companyId || row['companyId'] || row['company'] || ''),
    }));

    return normalized;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadMessage('');
    setAlert(null);
    const file = event.target.files?.[0] || null;
    setUploadFile(file);
  };

  const handleImport = async () => {
    if (!uploadFile) {
      setAlert({ type: 'error', message: 'กรุณาเลือกไฟล์ Excel ก่อนนำเข้า' });
      return;
    }

    setImporting(true);
    setAlert(null);
    try {
      const parsed = await parseExcelFile(uploadFile);
      if (!parsed.length) {
        setAlert({ type: 'error', message: 'ไฟล์ Excel ไม่มีข้อมูลสำหรับนำเข้า' });
        return;
      }
      const res = await fetch('/api/master-settings/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: `นำเข้าสำเร็จ ${data.count || parsed.length} รายการ` });
        setUploadFile(null);
        setUploadMessage('');
        fetchCustomers();
      } else {
        setAlert({ type: 'error', message: data.error || 'นำเข้า Excel ไม่สำเร็จ' });
      }
    } catch (error) {
      console.error(error);
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะนำเข้าไฟล์' });
    } finally {
      setImporting(false);
    }
  };

  const handleCreateCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    setAlert(null);

    const taxId = newCustomer.taxId.replace(/[^0-9]/g, '');
    if (!isValidThaiTaxId(taxId)) {
      setAlert({ type: 'error', message: 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง' });
      return;
    }

    try {
      const res = await fetch('/api/master-settings/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: 'บันทึกลูกค้าใหม่สำเร็จ' });
        setNewCustomer({ taxId: '', companyName: '', address: '', email: '', phoneNumber: '' });
        fetchCustomers();
      } else {
        setAlert({ type: 'error', message: data.error || 'ไม่สามารถบันทึกลูกค้าได้' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะบันทึก' });
    }
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' }}>
                  <Building2 className="text-emerald-600" size={22} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Customer Master</h1>
                  <p className="text-sm text-slate-500">จัดการข้อมูลบริษัทลูกค้า พร้อมระบบ Auto-lookup จากเลขผู้เสียภาษี</p>
                </div>
              </div>
              <div className="inline-flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">Premium Light Mode</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Data Isolation per Company</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">External API Lookup</span>
              </div>
            </div>
            <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              <Download size={16} /> ดาวน์โหลดเทมเพลต Excel
            </button>
          </div>

          {alert && (
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${alert.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {alert.message}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">นำเข้าข้อมูลลูกค้า ยกชุด</h2>
                  <p className="text-sm text-slate-500">รองรับเลขผู้เสียภาษี, ชื่อ, ที่อยู่, อีเมล, เบอร์โทร</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                  <FileText size={14} /> Excel Mapping
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">ลากแล้วปล่อย หรือเลือกไฟล์ Excel (.xlsx)</p>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="mt-3 w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700" />
                </div>
                {uploadFile && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">ไฟล์ที่เลือก</div>
                        <div>{uploadFile.name}</div>
                      </div>
                      <div className="text-xs text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <p className="mt-3 text-slate-500">หัวตารางที่รองรับ: taxId, companyName, address, email, phoneNumber</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleImport} disabled={importing} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                    <Upload size={16} /> {importing ? 'กำลังนำเข้า...' : 'นำเข้า Excel'}
                  </button>
                  <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Download size={16} /> ดาวน์โหลดเทมเพลตใหม่
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">เพิ่มลูกค้าใหม่</h2>
                  <p className="text-sm text-slate-500">ระบบจะค้นหาข้อมูลอัตโนมัติเมื่อพิมพ์ 13 หลัก</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <ShieldCheck size={14} /> Data Isolation
                </div>
              </div>
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                     <label className="block text-sm font-medium text-slate-700 flex justify-between">
                       <span>เลขประจำตัวผู้เสียภาษี (Tax ID)</span>
                       {isLookingUp && <span className="text-emerald-600 text-xs animate-pulse font-bold">กำลังค้นหา...</span>}
                     </label>
                     <input value={newCustomer.taxId} required maxLength={13} onChange={(e) => setNewCustomer((prev) => ({ ...prev, taxId: e.target.value }))} className="w-full mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 font-mono font-medium" placeholder="0000000000000" />
                  </div>
                  <div className="sm:col-span-2">
                     <label className="block text-sm font-medium text-slate-700">ชื่อบริษัท / ลูกค้า</label>
                     <input value={newCustomer.companyName} required onChange={(e) => setNewCustomer((prev) => ({ ...prev, companyName: e.target.value }))} className="w-full mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200" placeholder="ระบุชื่อบริษัท" />
                  </div>
                  <div className="sm:col-span-2">
                     <label className="block text-sm font-medium text-slate-700">ที่อยู่ (Address)</label>
                     <input value={newCustomer.address} onChange={(e) => setNewCustomer((prev) => ({ ...prev, address: e.target.value }))} className="w-full mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200" placeholder="ที่อยู่จัดส่ง / สาขา" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700">อีเมล</label>
                     <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))} className="w-full mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200" placeholder="example@email.com" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700">เบอร์โทรศัพท์</label>
                     <input value={newCustomer.phoneNumber} onChange={(e) => setNewCustomer((prev) => ({ ...prev, phoneNumber: e.target.value }))} className="w-full mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200" placeholder="08x-xxx-xxxx" />
                  </div>
                </div>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                  <Plus size={16} /> บันทึกลูกค้า
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">รายชื่อลูกค้าทั้งหมด</h2>
                <p className="text-sm text-slate-500">ค้นหาและจัดการข้อมูลลูกค้าเพื่อใช้ในระบบ Job Management</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหา ชื่อ, TaxID หรือเบอร์โทร" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[12px] uppercase tracking-[0.08em]">
                    <th className="p-4 rounded-tl-3xl">Tax ID</th>
                    <th className="p-4">ชื่อบริษัท</th>
                    <th className="p-4">ที่อยู่</th>
                    <th className="p-4">ผู้ติดต่อ</th>
                    <th className="p-4 rounded-tr-3xl">บริษัทเจ้าของข้อมูล</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        {Array.from({ length: 5 }).map((__, cellIdx) => (
                          <td key={cellIdx} className="p-4"><div className="h-4 w-full rounded-full bg-slate-200 animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredCustomers.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">ไม่พบลูกค้าที่ตรงกับคำค้น</td></tr>
                  ) : (
                    filteredCustomers.map((item) => (
                      <tr key={item._id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-medium text-emerald-700">{item.taxId}</td>
                        <td className="p-4 font-semibold text-slate-900">{item.companyName}</td>
                        <td className="p-4 text-slate-600 text-sm max-w-xs truncate">{item.address || '-'}</td>
                        <td className="p-4 text-slate-700 text-sm">
                          {item.email && <div className="flex items-center gap-1"><Mail size={12}/> {item.email}</div>}
                          {item.phoneNumber && <div className="flex items-center gap-1"><Phone size={12}/> {item.phoneNumber}</div>}
                          {(!item.email && !item.phoneNumber) && '-'}
                        </td>
                        <td className="p-4 text-slate-500 text-xs">{String(item.companyId).slice(-6)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
