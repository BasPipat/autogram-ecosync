'use client';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import {
  CalendarDays,
  IdCard,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  Truck,
  UserPlus,
  WalletCards,
  X,
} from 'lucide-react';

interface IUser {
  _id: string;
  username?: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
  phone?: string;
}

interface ISharedTruck {
  _id: string;
  headPlateNumber: string;
  tailPlateNumber: string;
  compulsoryInsuranceExpiresAt: string;
  vehicleInsuranceType: string;
  cargoInsuranceAmount: number;
  driverFirstName: string;
  driverLastName: string;
  driverLicenseType: string;
  driverPhone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName?: string;
}

type ActiveTab = 'users' | 'sharedTrucks';

type SharedTruckForm = {
  headPlateNumber: string;
  tailPlateNumber: string;
  compulsoryInsuranceExpiresAt: string;
  vehicleInsuranceType: string;
  cargoInsuranceAmount: string;
  driverFirstName: string;
  driverLastName: string;
  driverLicenseType: string;
  driverPhone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

const EMPTY_SHARED_TRUCK_FORM: SharedTruckForm = {
  headPlateNumber: '',
  tailPlateNumber: '',
  compulsoryInsuranceExpiresAt: '',
  vehicleInsuranceType: '',
  cargoInsuranceAmount: '',
  driverFirstName: '',
  driverLastName: '',
  driverLicenseType: '',
  driverPhone: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
};

const ROLE_META: Record<string, { bg: string; color: string; label: string }> = {
  system_owner: { bg: '#F3E8FF', color: '#7C3AED', label: 'System Owner' },
  owner: { bg: '#F3E8FF', color: '#7C3AED', label: 'System Owner' },
  admin: { bg: '#EEF2FF', color: '#4F46E5', label: 'Admin' },
  operator: { bg: '#DBEAFE', color: '#2563EB', label: 'Operator' },
  corp_admin: { bg: '#FFF7ED', color: '#C2410C', label: 'Corp Admin' },
  coordinator: { bg: '#ECFDF5', color: '#059669', label: 'Coordinator' },
};

const VEHICLE_INSURANCE_TYPES = ['ชั้น 1', 'ชั้น 2+', 'ชั้น 2', 'ชั้น 3+', 'ชั้น 3', 'ไม่มีประกัน'];
const DRIVER_LICENSE_TYPES = ['ท.1', 'ท.2', 'ท.3', 'ท.4', 'บ.1', 'บ.2', 'บ.3', 'บ.4'];
const BANK_OPTIONS = [
  'กรุงเทพ',
  'กสิกรไทย',
  'กรุงไทย',
  'ไทยพาณิชย์',
  'กรุงศรีอยุธยา',
  'ทหารไทยธนชาต',
  'ออมสิน',
  'เพื่อการเกษตรและสหกรณ์การเกษตร',
  'ยูโอบี',
  'ซีไอเอ็มบีไทย',
];

const isOwner = (role?: string) => role === 'system_owner' || role === 'owner';

const formatDateInput = (value?: string) => value ? value.slice(0, 10) : '';

const formatThaiDate = (value?: string) => {
  if (!value) return 'ไม่ระบุ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ไม่ระบุ';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date);
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount || 0);

const getInsuranceStatus = (value?: string) => {
  if (!value) return { label: 'ไม่ระบุ', bg: '#F1F5F9', color: '#64748B' };
  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return { label: 'ไม่ระบุ', bg: '#F1F5F9', color: '#64748B' };

  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: 'หมดอายุแล้ว', bg: '#FEF2F2', color: '#DC2626' };
  if (daysLeft <= 30) return { label: `เหลือ ${daysLeft} วัน`, bg: '#FFF7ED', color: '#C2410C' };
  return { label: `เหลือ ${daysLeft} วัน`, bg: '#ECFDF5', color: '#059669' };
};

export default function ManageUsersPage() {
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>('users');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: '', name: '', companyName: '', phone: '', password: '' });

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'coordinator', companyName: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [sharedTrucks, setSharedTrucks] = useState<ISharedTruck[]>([]);
  const [sharedTrucksLoaded, setSharedTrucksLoaded] = useState(false);
  const [sharedTruckLoading, setSharedTruckLoading] = useState(false);
  const [sharedTruckError, setSharedTruckError] = useState('');
  const [truckSearch, setTruckSearch] = useState('');
  const [showTruckForm, setShowTruckForm] = useState(false);
  const [editingSharedTruckId, setEditingSharedTruckId] = useState<string | null>(null);
  const [sharedTruckForm, setSharedTruckForm] = useState<SharedTruckForm>(EMPTY_SHARED_TRUCK_FORM);
  const [savingSharedTruck, setSavingSharedTruck] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSharedTrucks = useCallback(async () => {
    setSharedTruckLoading(true);
    setSharedTruckError('');
    try {
      const res = await fetch('/api/admin/shared-trucks', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setSharedTruckError(data.error || 'ไม่สามารถดึงข้อมูลรถร่วมได้');
        return;
      }
      setSharedTrucks(data);
      setSharedTrucksLoaded(true);
    } catch {
      setSharedTruckError('ระบบขัดข้องขณะดึงข้อมูลรถร่วม');
    } finally {
      setSharedTruckLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    const sessionRole = (session.user as { role?: string } | undefined)?.role;
    const timer = window.setTimeout(() => {
      fetchUsers();
      if (isOwner(sessionRole)) {
        fetchSharedTrucks();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchSharedTrucks, fetchUsers, router, session, status]);

  const currentUser = allUsers.find(u => u.email === session?.user?.email);
  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const currentRole = currentUser?.role || sessionRole;
  const isCurrentOwner = isOwner(currentRole);
  const canManage = !!currentRole && (isOwner(currentRole) || currentRole === 'admin');
  const visibleActiveTab = !isCurrentOwner && activeTab === 'sharedTrucks' ? 'users' : activeTab;

  const displayedUsers = allUsers.filter(user => {
    if (!currentUser) return false;
    if (isOwner(currentUser.role)) return true;
    if (['admin', 'operator', 'corp_admin'].includes(currentUser.role)) {
      return user.companyName === currentUser.companyName;
    }
    return false;
  });

  const filteredSharedTrucks = useMemo(() => {
    const query = truckSearch.trim().toLowerCase();
    if (!query) return sharedTrucks;

    return sharedTrucks.filter(truck => {
      const searchable = [
        truck.headPlateNumber,
        truck.tailPlateNumber,
        truck.driverFirstName,
        truck.driverLastName,
        truck.driverPhone,
        truck.driverLicenseType,
        truck.bankName,
        truck.bankAccountNumber,
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [sharedTrucks, truckSearch]);

  if (status === 'loading') {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
          <Loader2 className="animate-spin mr-2" size={18} /> กำลังตรวจสอบสิทธิ์...
        </div>
      </SidebarLayout>
    );
  }

  const inputStyle: CSSProperties = {
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
  };

  const handleEditClick = (user: IUser) => {
    setEditingUserId(user._id);
    setEditForm({ username: user.username || '', name: user.name || '', companyName: user.companyName || '', phone: user.phone || '', password: '' });
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...editForm }),
      });
      if (res.ok) {
        setEditingUserId(null);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      alert('ระบบขัดข้อง');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newRole }),
    });
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`ลบ "${userName}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'เพิ่มสมาชิกไม่สำเร็จ');
        return;
      }
      setShowInvite(false);
      setInviteForm({ name: '', email: '', password: '', role: 'coordinator', companyName: currentUser?.companyName || '' });
      fetchUsers();
    } catch {
      setInviteError('ระบบขัดข้อง');
    } finally {
      setInviting(false);
    }
  };

  const handleSharedTruckFormChange = (field: keyof SharedTruckForm, value: string) => {
    setSharedTruckForm(prev => ({ ...prev, [field]: value }));
  };

  const handleStartAddSharedTruck = () => {
    setEditingSharedTruckId(null);
    setSharedTruckForm(EMPTY_SHARED_TRUCK_FORM);
    setSharedTruckError('');
    setShowTruckForm(true);
  };

  const handleEditSharedTruck = (truck: ISharedTruck) => {
    setEditingSharedTruckId(truck._id);
    setSharedTruckForm({
      headPlateNumber: truck.headPlateNumber || '',
      tailPlateNumber: truck.tailPlateNumber || '',
      compulsoryInsuranceExpiresAt: formatDateInput(truck.compulsoryInsuranceExpiresAt),
      vehicleInsuranceType: truck.vehicleInsuranceType || '',
      cargoInsuranceAmount: String(truck.cargoInsuranceAmount ?? ''),
      driverFirstName: truck.driverFirstName || '',
      driverLastName: truck.driverLastName || '',
      driverLicenseType: truck.driverLicenseType || '',
      driverPhone: truck.driverPhone || '',
      bankName: truck.bankName || '',
      bankAccountNumber: truck.bankAccountNumber || '',
      bankAccountName: truck.bankAccountName || '',
    });
    setSharedTruckError('');
    setShowTruckForm(true);
  };

  const handleSaveSharedTruck = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSharedTruck(true);
    setSharedTruckError('');
    try {
      const payload = {
        ...sharedTruckForm,
        cargoInsuranceAmount: Number(sharedTruckForm.cargoInsuranceAmount),
        ...(editingSharedTruckId ? { sharedTruckId: editingSharedTruckId } : {}),
      };
      const res = await fetch('/api/admin/shared-trucks', {
        method: editingSharedTruckId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSharedTruckError(data.error || 'บันทึกข้อมูลรถร่วมไม่สำเร็จ');
        return;
      }

      setShowTruckForm(false);
      setEditingSharedTruckId(null);
      setSharedTruckForm(EMPTY_SHARED_TRUCK_FORM);
      fetchSharedTrucks();
    } catch {
      setSharedTruckError('ระบบขัดข้องขณะบันทึกข้อมูลรถร่วม');
    } finally {
      setSavingSharedTruck(false);
    }
  };

  const handleDeleteSharedTruck = async (truck: ISharedTruck) => {
    if (!confirm(`ลบข้อมูลรถร่วมทะเบียน ${truck.headPlateNumber} / ${truck.tailPlateNumber}?`)) return;
    setSharedTruckError('');
    try {
      const res = await fetch(`/api/admin/shared-trucks?sharedTruckId=${encodeURIComponent(truck._id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setSharedTruckError(data.error || 'ลบข้อมูลรถร่วมไม่สำเร็จ');
        return;
      }
      fetchSharedTrucks();
    } catch {
      setSharedTruckError('ระบบขัดข้องขณะลบข้อมูลรถร่วม');
    }
  };

  const renderTabButton = (tab: ActiveTab, label: string, icon: typeof Shield) => {
    const active = visibleActiveTab === tab;
    const Icon = icon;
    return (
      <button
        type="button"
        onClick={() => {
          setActiveTab(tab);
          if (tab === 'sharedTrucks') {
            setShowInvite(false);
            if (isCurrentOwner && !sharedTrucksLoaded && !sharedTruckLoading) {
              fetchSharedTrucks();
            }
          }
        }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
        style={{
          background: active ? 'var(--accent-glow)' : 'var(--bg-card)',
          color: active ? 'var(--accent)' : 'var(--text-secondary)',
          border: `1px solid ${active ? 'rgba(16,185,129,0.28)' : 'var(--border)'}`,
          boxShadow: active ? 'var(--shadow-sm)' : 'none',
        }}
      >
        <Icon size={15} />
        {label}
      </button>
    );
  };

  const renderUsersSection = () => (
    <>
      {showInvite && canManage && (
        <div className="card p-6 mb-6 animate-fade-in">
          <h3 className="text-[14px] font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Plus size={16} style={{ color: 'var(--accent)' }} /> เพิ่มสมาชิกใหม่
          </h3>

          {inviteError && (
            <div className="mb-4 px-4 py-2.5 rounded-xl text-[12px]" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              {inviteError}
            </div>
          )}

          <form onSubmit={handleInvite} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ชื่อ*</label>
              <input required className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                placeholder="ชื่อ-นามสกุล หรือชื่อบริษัท" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>อีเมล*</label>
              <input required type="email" className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="example@company.com" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>รหัสผ่าน*</label>
              <input required type="password" className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="ตั้งรหัสผ่าน" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>บริษัท</label>
              <input className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={inviteForm.companyName} onChange={e => setInviteForm({ ...inviteForm, companyName: e.target.value })}
                placeholder={currentUser?.companyName || 'ชื่อบริษัท'} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Role*</label>
              <select className="w-full p-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}
                value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}>
                {isOwner(currentRole) && (
                  <optgroup label="Autogram Internal">
                    <option value="owner">System Owner</option>
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                  </optgroup>
                )}
                {currentRole === 'admin' && (
                  <optgroup label="Autogram">
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                  </optgroup>
                )}
                <optgroup label="ลูกค้า">
                  <option value="corp_admin">Corp Admin</option>
                  <option value="coordinator">Coordinator</option>
                </optgroup>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={inviting}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {inviting ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
                {inviting ? 'กำลังเพิ่ม...' : 'เพิ่มสมาชิก'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px]">
            <thead>
              <tr style={{ background: 'var(--bg-base)' }}>
                {['User ID (Login)', 'ชื่อผู้ใช้', 'บริษัท', 'เบอร์โทร', 'อีเมล', 'Password ใหม่', 'Role', 'จัดการ'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
                    <Loader2 className="inline animate-spin mr-2" size={16} />
                    กำลังดึงข้อมูล...
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
                    ไม่พบข้อมูลผู้ใช้งาน กรุณาตรวจสอบสิทธิ์ผู้ใช้ในฐานข้อมูล
                  </td>
                </tr>
              ) : (
                displayedUsers.map(user => {
                  const isEditing = editingUserId === user._id;
                  const meta = ROLE_META[user.role] || { bg: 'var(--border-light)', color: 'var(--text-tertiary)', label: user.role };
                  return (
                    <tr key={user._id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border-light)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-3">
                        {isEditing
                          ? <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
                          : <span className="font-mono font-bold text-[12px]" style={{ color: '#3B82F6' }}>{user.username || 'ไม่ระบุ'}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {isEditing
                          ? <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                          : <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {isEditing
                          ? <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.companyName} onChange={e => setEditForm({ ...editForm, companyName: e.target.value })} />
                          : <span style={{ color: 'var(--text-secondary)' }}>{user.companyName || 'ไม่ระบุ'}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {isEditing
                          ? <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                          : <span style={{ color: 'var(--text-secondary)' }}>{user.phone || 'ไม่ระบุ'}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{user.email}</td>
                      <td className="px-4 py-3">
                        {isEditing
                          ? <input type="password" className="w-full p-2 text-[12px] outline-none" style={{ ...inputStyle, borderColor: '#FECACA', background: '#FEF2F2' }}
                              placeholder="รหัสผ่านใหม่..." value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
                          : <span style={{ color: 'var(--border)' }}>••••••••</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit" style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                          {canManage && (
                            <select
                              className="p-1.5 text-[11px] outline-none cursor-pointer rounded-lg"
                              style={{ ...inputStyle, fontSize: '11px' }}
                              value={user.role}
                              onChange={e => handleRoleChange(user._id, e.target.value)}
                              disabled={user.email === session?.user?.email && isOwner(user.role)}
                            >
                              {isOwner(currentRole) && (
                                <optgroup label="Autogram Internal">
                                  <option value="owner">System Owner</option>
                                  <option value="admin">Admin</option>
                                  <option value="operator">Operator</option>
                                </optgroup>
                              )}
                              {currentRole === 'admin' && (
                                <optgroup label="Autogram">
                                  <option value="admin">Admin</option>
                                  <option value="operator">Operator</option>
                                </optgroup>
                              )}
                              <optgroup label="ลูกค้า">
                                <option value="corp_admin">Corp Admin</option>
                                <option value="coordinator">Coordinator</option>
                              </optgroup>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5">
                            <button onClick={() => handleSaveEdit(user._id)}
                              className="py-1.5 px-3 rounded-lg text-[11px] font-bold"
                              style={{ background: '#ECFDF5', color: '#059669' }}>
                              บันทึก
                            </button>
                            <button onClick={() => setEditingUserId(null)}
                              className="py-1.5 px-3 rounded-lg text-[11px]"
                              style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}>
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {canManage && (
                              <button onClick={() => handleEditClick(user)}
                                className="py-1.5 px-3 rounded-lg text-[11px] font-bold"
                                style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                                แก้ไข
                              </button>
                            )}
                            {canManage && (
                              <button onClick={() => handleDeleteUser(user._id, user.name)}
                                disabled={user.email === session?.user?.email}
                                className="py-1.5 px-3 rounded-lg text-[11px] font-bold disabled:opacity-20"
                                style={{ background: '#FEF2F2', color: '#DC2626' }}>
                                ลบ
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderSharedTruckForm = () => (
    <div className="card p-6 mb-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h3 className="text-[14px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Truck size={16} style={{ color: 'var(--accent)' }} />
          {editingSharedTruckId ? 'แก้ไขข้อมูลรถร่วม' : 'เพิ่มข้อมูลรถร่วม'}
        </h3>
        <button
          type="button"
          onClick={() => {
            setShowTruckForm(false);
            setEditingSharedTruckId(null);
            setSharedTruckForm(EMPTY_SHARED_TRUCK_FORM);
          }}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-tertiary)', background: 'var(--border-light)' }}
          aria-label="ปิดฟอร์ม"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSaveSharedTruck} className="space-y-5">
        <datalist id="vehicle-insurance-types">
          {VEHICLE_INSURANCE_TYPES.map(option => <option key={option} value={option} />)}
        </datalist>
        <datalist id="driver-license-types">
          {DRIVER_LICENSE_TYPES.map(option => <option key={option} value={option} />)}
        </datalist>
        <datalist id="bank-options">
          {BANK_OPTIONS.map(option => <option key={option} value={option} />)}
        </datalist>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Truck size={15} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>ข้อมูลรถ</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ทะเบียนหัว*</label>
              <input required className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.headPlateNumber} onChange={e => handleSharedTruckFormChange('headPlateNumber', e.target.value)}
                placeholder="70-1234" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ทะเบียนหาง*</label>
              <input required className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.tailPlateNumber} onChange={e => handleSharedTruckFormChange('tailPlateNumber', e.target.value)}
                placeholder="71-5678" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>พรบ.หมดอายุ*</label>
              <input required type="date" className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.compulsoryInsuranceExpiresAt} onChange={e => handleSharedTruckFormChange('compulsoryInsuranceExpiresAt', e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ประเภทประกันรถ*</label>
              <input required list="vehicle-insurance-types" className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.vehicleInsuranceType} onChange={e => handleSharedTruckFormChange('vehicleInsuranceType', e.target.value)}
                placeholder="เช่น ชั้น 1, ชั้น 3+" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ประกันสินค้า*</label>
              <input required type="number" min="0" step="1" className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.cargoInsuranceAmount} onChange={e => handleSharedTruckFormChange('cargoInsuranceAmount', e.target.value)}
                placeholder="500000" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <IdCard size={15} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>ข้อมูลคนขับ</span>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ชื่อ*</label>
              <input required className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.driverFirstName} onChange={e => handleSharedTruckFormChange('driverFirstName', e.target.value)}
                placeholder="ชื่อ" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>นามสกุล*</label>
              <input required className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.driverLastName} onChange={e => handleSharedTruckFormChange('driverLastName', e.target.value)}
                placeholder="นามสกุล" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ประเภทใบขับขี่*</label>
              <input required list="driver-license-types" className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.driverLicenseType} onChange={e => handleSharedTruckFormChange('driverLicenseType', e.target.value)}
                placeholder="เช่น ท.3" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>เบอร์โทรศัพท์*</label>
              <input required className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.driverPhone} onChange={e => handleSharedTruckFormChange('driverPhone', e.target.value)}
                placeholder="08x-xxx-xxxx" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <WalletCards size={15} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>ข้อมูลโอนเงิน</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ธนาคาร*</label>
              <input required list="bank-options" className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.bankName} onChange={e => handleSharedTruckFormChange('bankName', e.target.value)}
                placeholder="ชื่อธนาคาร" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>เลขบัญชี*</label>
              <input required className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.bankAccountNumber} onChange={e => handleSharedTruckFormChange('bankAccountNumber', e.target.value)}
                placeholder="เลขบัญชีโอนเงิน" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>ชื่อบัญชี</label>
              <input className="w-full p-2.5 text-[13px] outline-none" style={inputStyle}
                value={sharedTruckForm.bankAccountName} onChange={e => handleSharedTruckFormChange('bankAccountName', e.target.value)}
                placeholder="ชื่อบัญชี" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setShowTruckForm(false);
              setEditingSharedTruckId(null);
              setSharedTruckForm(EMPTY_SHARED_TRUCK_FORM);
            }}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={savingSharedTruck}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-60"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {savingSharedTruck ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
            {savingSharedTruck ? 'กำลังบันทึก...' : 'บันทึกข้อมูลรถร่วม'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderSharedTrucksSection = () => (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 animate-fade-in">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>ข้อมูลรถร่วม</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            {sharedTrucks.length} รายการ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              className="w-[260px] max-w-full pl-9 pr-3 py-2.5 text-[13px] outline-none"
              style={inputStyle}
              value={truckSearch}
              onChange={e => setTruckSearch(e.target.value)}
              placeholder="ค้นหาทะเบียน ชื่อ เบอร์โทร"
            />
          </div>
          <button
            type="button"
            onClick={handleStartAddSharedTruck}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus size={15} />
            เพิ่มรถร่วม
          </button>
        </div>
      </div>

      {sharedTruckError && (
        <div className="mb-4 px-4 py-2.5 rounded-xl text-[12px] animate-fade-in" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
          {sharedTruckError}
        </div>
      )}

      {showTruckForm && renderSharedTruckForm()}

      <div className="card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1250px]">
            <thead>
              <tr style={{ background: 'var(--bg-base)' }}>
                {['ทะเบียนรถ', 'พ.ร.บ.', 'ประกันรถ', 'ประกันสินค้า', 'คนขับ', 'ใบขับขี่', 'เบอร์โทร', 'บัญชีโอนเงิน', 'จัดการ'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {sharedTruckLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
                    <Loader2 className="inline animate-spin mr-2" size={16} />
                    กำลังดึงข้อมูลรถร่วม...
                  </td>
                </tr>
              ) : filteredSharedTrucks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
                    ไม่พบข้อมูลรถร่วม
                  </td>
                </tr>
              ) : (
                filteredSharedTrucks.map(truck => {
                  const insuranceStatus = getInsuranceStatus(truck.compulsoryInsuranceExpiresAt);
                  return (
                    <tr key={truck._id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border-light)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>หัว: {truck.headPlateNumber}</div>
                          <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>หาง: {truck.tailPlateNumber}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            <CalendarDays size={13} />
                            {formatThaiDate(truck.compulsoryInsuranceExpiresAt)}
                          </div>
                          <div className="w-fit px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: insuranceStatus.bg, color: insuranceStatus.color }}>
                            {insuranceStatus.label}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {truck.vehicleInsuranceType}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(truck.cargoInsuranceAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {truck.driverFirstName} {truck.driverLastName}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {truck.driverLicenseType}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {truck.driverPhone}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{truck.bankName}</div>
                          <div className="font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>{truck.bankAccountNumber}</div>
                          {truck.bankAccountName && (
                            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{truck.bankAccountName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditSharedTruck(truck)}
                            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold"
                            style={{ background: '#EFF6FF', color: '#3B82F6' }}
                          >
                            <Pencil size={12} />
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSharedTruck(truck)}
                            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold"
                            style={{ background: '#FEF2F2', color: '#DC2626' }}
                          >
                            <Trash2 size={12} />
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F3E8FF, #E9D5FF)' }}>
              <Shield size={20} style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>การจัดการผู้ใช้งาน</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                {displayedUsers.length} สมาชิก {isCurrentOwner ? '(ทุกบริษัท / God Mode)' : `(${currentUser?.companyName || ''})`}
              </p>
            </div>
          </div>

          {canManage && visibleActiveTab === 'users' && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: showInvite ? 'var(--border-light)' : 'var(--accent)', color: showInvite ? 'var(--text-secondary)' : '#fff' }}
            >
              {showInvite ? <><X size={15} /> ยกเลิก</> : <><UserPlus size={15} /> เพิ่มสมาชิก</>}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6 animate-fade-in">
          {renderTabButton('users', 'ผู้ใช้งาน', Shield)}
          {isCurrentOwner && renderTabButton('sharedTrucks', 'รถร่วม', Truck)}
        </div>

        {visibleActiveTab === 'users' && renderUsersSection()}
        {visibleActiveTab === 'sharedTrucks' && isCurrentOwner && renderSharedTrucksSection()}
      </div>
    </SidebarLayout>
  );
}
