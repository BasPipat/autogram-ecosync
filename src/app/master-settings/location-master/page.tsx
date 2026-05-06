'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Download, Upload, Search, Plus, FileText, MapPin, ShieldCheck, Pencil, Trash2, X } from 'lucide-react';
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
  const [importing, setImporting] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', locationLink: '', contactPerson: '', phoneNumber: '' });
  const [editId, setEditId] = useState<string | null>(null);
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

  const handleCreateOrUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setAlert(null);
    try {
      const url = editId ? `/api/master-settings/locations/${editId}` : '/api/master-settings/locations';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLocation),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: editId ? 'แก้ไขสถานที่สำเร็จ' : 'บันทึกสถานที่ใหม่สำเร็จ' });
        setNewLocation({ name: '', locationLink: '', contactPerson: '', phoneNumber: '' });
        setEditId(null);
        fetchLocations();
      } else {
        setAlert({ type: 'error', message: data.error || 'ไม่สามารถบันทึกได้' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะบันทึก' });
    }
  };

  const handleEditClick = (item: any) => {
    setEditId(item._id);
    setNewLocation({
      name: item.name,
      locationLink: item.locationLink || '',
      contactPerson: item.contactPerson || '',
      phoneNumber: item.phoneNumber || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสถานที่นี้?')) return;
    
    try {
      const res = await fetch(`/api/master-settings/locations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: 'ลบสถานที่สำเร็จ' });
        fetchLocations();
      } else {
        setAlert({ type: 'error', message: data.error || 'ลบไม่สำเร็จ' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาดขณะลบ' });
    }
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
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
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${alert.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              {alert.message}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            {/* Import Box */}
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
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleImport} disabled={importing} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    <Upload size={16} /> {importing ? 'กำลังนำเข้า...' : 'นำเข้า Excel'}
                  </button>
                </div>
              </div>
            </div>

            {/* Form Box */}
            <div className={`rounded-3xl bg-white p-6 shadow-sm border transition-all duration-500 ${editId ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{editId ? 'แก้ไขข้อมูลสถานที่' : 'เพิ่มสถานที่ใหม่'}</h2>
                  <p className="text-sm text-slate-500">ข้อมูลนี้จะถูกดึงไปใช้ในหน้าจัดการงานขนส่ง</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${editId ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {editId ? <Pencil size={14} /> : <ShieldCheck size={14} />} {editId ? 'Editing Mode' : 'Data Isolation'}
                </div>
              </div>
              <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="col-span-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">ชื่อสถานที่</label>
                    <input value={newLocation.name} required onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="เช่น ท่าเรือแหลมฉบัง, คลังสินค้าบางปะอิน" />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">ลิงก์พิกัดแผนที่ (Google Maps)</label>
                    <input value={newLocation.locationLink} onChange={(e) => setNewLocation((prev) => ({ ...prev, locationLink: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="https://maps.google.com/?q=..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">ชื่อผู้ติดต่อ</label>
                    <input value={newLocation.contactPerson} onChange={(e) => setNewLocation((prev) => ({ ...prev, contactPerson: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="ระบุชื่อ" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">เบอร์โทรศัพท์</label>
                    <input value={newLocation.phoneNumber} onChange={(e) => setNewLocation((prev) => ({ ...prev, phoneNumber: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="08x-xxx-xxxx" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition-all shadow-lg ${editId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}>
                    {editId ? <Pencil size={16} /> : <Plus size={16} />} {editId ? 'บันทึกการแก้ไข' : 'บันทึก Location'}
                  </button>
                  {editId && (
                    <button type="button" onClick={() => { setEditId(null); setNewLocation({ name: '', locationLink: '', contactPerson: '', phoneNumber: '' }); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">
                      <X size={16} /> ยกเลิก
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Table Box */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">รายการ Location ทั้งหมด</h2>
                <p className="text-sm text-slate-500">จัดการข้อมูลสถานที่ของคุณเพื่อความสะดวกในการเรียกใช้งาน</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อ, พิกัด หรือเบอร์ติดต่อ..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-4 border-b border-slate-100">ชื่อสถานที่</th>
                    <th className="p-4 border-b border-slate-100">พิกัด / ลิงก์</th>
                    <th className="p-4 border-b border-slate-100 text-center">ผู้ติดต่อ</th>
                    <th className="p-4 border-b border-slate-100 text-center">เบอร์โทร</th>
                    <th className="p-4 border-b border-slate-100 text-right pr-6">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    [...Array(5)].map((_, idx) => (
                      <tr key={idx}>
                        <td colSpan={5} className="p-4"><div className="h-10 w-full rounded-xl bg-slate-50 animate-pulse" /></td>
                      </tr>
                    ))
                  ) : filteredLocations.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">ไม่พบข้อมูลในระบบ</td></tr>
                  ) : (
                    filteredLocations.map((item) => (
                      <tr key={item._id} className={`group hover:bg-slate-50/50 transition-all ${editId === item._id ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                        </td>
                        <td className="p-4">
                          {item.locationLink ? (
                            <a href={item.locationLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 max-w-[200px] truncate">
                              <Globe size={12} /> ดูบนแผนที่
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300 italic">ไม่มีพิกัด</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 text-sm text-center">{item.contactPerson || '-'}</td>
                        <td className="p-4 text-slate-600 text-sm text-center font-mono">{item.phoneNumber || '-'}</td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditClick(item)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="แก้ไข">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(item._id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="ลบ">
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
        </div>
      </div>
    </SidebarLayout>
  );
}
