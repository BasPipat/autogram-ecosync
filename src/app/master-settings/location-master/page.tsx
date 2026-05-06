'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Download, Upload, Search, Plus, FileText, MapPin, User, Phone, Globe, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

const FIELD_HEADERS = [
  { key: 'name', label: 'name' },
  { key: 'locationLink', label: 'locationLink' },
  { key: 'contactPerson', label: 'contactPerson' },
  { key: 'phoneNumber', label: 'phoneNumber' },
  { key: 'companyId', label: 'companyId (optional for System Owner)' },
];

export default function LocationMasterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', locationLink: '', contactPerson: '', phoneNumber: '' });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    fetchLocations();
  }, [status, router]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master-settings/locations', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.locations)) {
        setLocations(data.locations);
      } else {
        setAlert({ type: 'error', message: data.error || 'ไม่สามารถโหลดข้อมูลสถานที่ได้' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะโหลดข้อมูล' });
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return locations;
    return locations.filter((item) =>
      [item.name, item.locationLink, item.contactPerson, item.phoneNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [locations, searchTerm]);

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([{ name: '', locationLink: '', contactPerson: '', phoneNumber: '', companyId: '' }], { header: FIELD_HEADERS.map((item) => item.label) });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LocationTemplate');
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'location-master-template.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parseExcelFile = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const normalized = rows.map((row) => ({
      name: row.name || row['ชื่อสถานที่'] || row['location'] || row['Location'] || row['location name'] || '',
      locationLink: row.locationLink || row['locationLink'] || row['ลิงก์พิกัด'] || row['location link'] || row['mapUrl'] || row['MapLink'] || '',
      contactPerson: row.contactPerson || row['contactPerson'] || row['ผู้ติดต่อ'] || row['Contact Person'] || '',
      phoneNumber: row.phoneNumber || row['phoneNumber'] || row['เบอร์โทรศัพท์'] || row['Phone Number'] || row['Phone'] || '',
      companyId: row.companyId || row['companyId'] || row['company'] || '',
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
      const res = await fetch('/api/master-settings/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: `นำเข้าสำเร็จ ${data.count || parsed.length} รายการ` });
        setUploadFile(null);
        setUploadMessage('');
        fetchLocations();
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

  const handleCreateLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    setAlert(null);
    try {
      const res = await fetch('/api/master-settings/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: 'บันทึกสถานที่ใหม่สำเร็จ' });
        setNewLocation({ name: '', locationLink: '', contactPerson: '', phoneNumber: '' });
        fetchLocations();
      } else {
        setAlert({ type: 'error', message: data.error || 'ไม่สามารถบันทึกสถานที่ได้' });
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
                <div className="w-11 h-11 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
                  <MapPin className="text-blue-600" size={22} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Location Master</h1>
                  <p className="text-sm text-slate-500">สมุดที่อยู่สถานที่ พร้อมระบบ Import Excel และ Auto-fill สำหรับงานขนส่ง</p>
                </div>
              </div>
              <div className="inline-flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">Premium Light Mode</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Data Isolation per Company</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Autocomplete / Auto-fill</span>
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
                  <h2 className="text-lg font-semibold text-slate-900">นำเข้า Location ยกชุด</h2>
                  <p className="text-sm text-slate-500">รองรับชื่อ, พิกัด, ผู้ติดต่อ และเบอร์โทร</p>
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
                    <p className="mt-3 text-slate-500">หัวตารางที่รองรับ: name, locationLink, contactPerson, phoneNumber, companyId</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleImport} disabled={importing} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
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
                  <h2 className="text-lg font-semibold text-slate-900">เพิ่มสถานที่ใหม่</h2>
                  <p className="text-sm text-slate-500">บันทึกที่เดียวเพื่อใช้ใน Job Management</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <ShieldCheck size={14} /> Data Isolation
                </div>
              </div>
              <form onSubmit={handleCreateLocation} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">ชื่อสถานที่</label>
                  <input value={newLocation.name} required onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                  <label className="block text-sm font-medium text-slate-700">ลิงก์พิกัดแผนที่</label>
                  <input value={newLocation.locationLink} required onChange={(e) => setNewLocation((prev) => ({ ...prev, locationLink: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" placeholder="https://maps.google.com/?q=13.7,100.5" />
                  <label className="block text-sm font-medium text-slate-700">ผู้ติดต่อ</label>
                  <input value={newLocation.contactPerson} onChange={(e) => setNewLocation((prev) => ({ ...prev, contactPerson: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                  <label className="block text-sm font-medium text-slate-700">เบอร์โทรศัพท์</label>
                  <input value={newLocation.phoneNumber} onChange={(e) => setNewLocation((prev) => ({ ...prev, phoneNumber: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" placeholder="08x-xxx-xxxx" />
                </div>
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                  <Plus size={16} /> บันทึก Location
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">รายการ Location ทั้งหมด</h2>
                <p className="text-sm text-slate-500">ค้นหาและจัดการข้อมูลสถานที่เพื่อใช้ในฟอร์ม Job Management</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหา ชื่อ สถานที่ ผู้ติดต่อ หรือเบอร์" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[12px] uppercase tracking-[0.08em]">
                    <th className="p-4 rounded-tl-3xl">ชื่อสถานที่</th>
                    <th className="p-4">พิกัด / ลิงก์</th>
                    <th className="p-4">ผู้ติดต่อ</th>
                    <th className="p-4">เบอร์โทร</th>
                    <th className="p-4 rounded-tr-3xl">บริษัท</th>
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
                  ) : filteredLocations.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">ไม่พบ Location ที่ตรงกับคำค้น</td></tr>
                  ) : (
                    filteredLocations.map((item) => (
                      <tr key={item._id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-slate-900">{item.name}</td>
                        <td className="p-4 text-slate-600 break-words"><a href={item.locationLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{item.locationLink}</a></td>
                        <td className="p-4 text-slate-700">{item.contactPerson || '-'}</td>
                        <td className="p-4 text-slate-700">{item.phoneNumber || '-'}</td>
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
