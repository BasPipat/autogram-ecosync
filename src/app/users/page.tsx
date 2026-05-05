'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Users, Loader2, Shield } from 'lucide-react';

interface IUser {
  _id: string;
  username?: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
  phone?: string;
}

export default function ManageUsersPage() {
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: '', name: '', companyName: '', phone: '', password: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch {
      // ignore fetch errors
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    fetchUsers();
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
          <Loader2 className="animate-spin mr-2" size={18} />
          กำลังตรวจสอบสิทธิ์ผู้ใช้งาน...
        </div>
      </SidebarLayout>
    );
  }

  const currentUser = allUsers.find(u => u.email === session?.user?.email);

  const displayedUsers = allUsers.filter(user => {
    if (!currentUser) return false;
    const isAutogram = ['owner', 'admin', 'operator'].includes(currentUser.role);
    if (isAutogram) return true;
    if (currentUser.role === 'corp_admin') return user.companyName === currentUser.companyName;
    return false;
  });

  const handleEditClick = (user: IUser) => {
    setEditingUserId(user._id);
    setEditForm({
      username: user.username || '',
      name: user.name || '',
      companyName: user.companyName || '',
      phone: user.phone || '',
      password: ''
    });
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...editForm }),
      });
      if (res.ok) {
        alert('บันทึกสำเร็จ!');
        setEditingUserId(null);
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || 'บันทึกไม่สำเร็จ');
      }
    } catch { alert('ระบบขัดข้อง'); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newRole }),
    });
    fetchUsers();
  };

  // 🟢 อัปเดตใหม่: ส่งคำสั่งลบพร้อมแพ็กเกจข้อมูล (Body) 
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`คุณต้องการลบ "${userName}" ใช่หรือไม่?`)) return;
    
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        alert('ลบข้อมูลเรียบร้อยแล้วครับ!');
        fetchUsers();
      } else {
        const data = await res.json();
        alert(`ไม่สามารถลบได้: ${data.error}`);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ครับ');
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      owner: { bg: '#F3E8FF', color: '#7C3AED', label: 'Owner' },
      admin: { bg: '#EEF2FF', color: '#4F46E5', label: 'Admin' },
      operator: { bg: '#DBEAFE', color: '#2563EB', label: 'Operator' },
      corp_admin: { bg: '#FFF7ED', color: '#C2410C', label: 'Corp Admin' },
      coordinator: { bg: '#ECFDF5', color: '#059669', label: 'Coordinator' },
    };
    const s = styles[role] || { bg: 'var(--border-light)', color: 'var(--text-tertiary)', label: role };
    return (
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
        style={{ background: s.bg, color: s.color }}
      >
        {s.label}
      </span>
    );
  };

  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
  };

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F3E8FF, #E9D5FF)' }}
            >
              <Shield size={20} style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>การจัดการผู้ใช้งานและสิทธิ์</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                ตั้งค่า User ID สำหรับ Login และข้อมูลติดต่อสำหรับวางบิลลูกค้า
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1200px]">
              <thead>
                <tr style={{ background: 'var(--bg-base)' }}>
                  {['User ID (Login)', 'ชื่อผู้ใช้', 'บริษัท (วางบิล)', 'เบอร์โทรศัพท์', 'อีเมล', 'Password ใหม่', 'ระดับสิทธิ์', 'จัดการ'].map((h) => (
                    <th key={h} className="p-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
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
                      กำลังดึงข้อมูลล่าสุด...
                    </td>
                  </tr>
                ) : displayedUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--border-light)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} />
                      ) : (<span className="font-mono font-bold" style={{ color: '#3B82F6' }}>{user.username || '-'}</span>)}
                    </td>
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                      ) : (<span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</span>)}
                    </td>
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.companyName} onChange={(e) => setEditForm({...editForm, companyName: e.target.value})} />
                      ) : (<span style={{ color: 'var(--text-secondary)' }}>{user.companyName || '-'}</span>)}
                    </td>
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                      ) : (<span style={{ color: 'var(--text-secondary)' }}>{user.phone || '-'}</span>)}
                    </td>
                    <td className="p-4 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{user.email}</td>
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input className="w-full p-2 text-[12px] outline-none" style={{ ...inputStyle, borderColor: '#FECACA', background: '#FEF2F2' }} placeholder="รหัสผ่านใหม่..." value={editForm.password} onChange={(e) => setEditForm({...editForm, password: e.target.value})} />
                      ) : (<span style={{ color: 'var(--border)' }}>********</span>)}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        {getRoleBadge(user.role)}
                        <select
                          className="p-1.5 text-[11px] outline-none cursor-pointer rounded-lg"
                          style={{ ...inputStyle, fontSize: '11px' }}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          disabled={user.email === session?.user?.email && (user.role === 'owner' || user.role === 'admin')}
                        >
                          {['owner', 'admin', 'operator'].includes(currentUser?.role || '') && (
                            <optgroup label="ฝั่ง Autogram">
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="operator">Operator</option>
                            </optgroup>
                          )}
                          <optgroup label="ฝั่งลูกค้า">
                            <option value="corp_admin">Corp Admin</option>
                            <option value="coordinator">Coordinator</option>
                          </optgroup>
                        </select>
                      </div>
                    </td>
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(user._id)}
                            className="py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                            style={{ background: '#ECFDF5', color: '#059669' }}
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="py-1.5 rounded-lg text-[11px] transition-colors"
                            style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                            style={{ background: '#EFF6FF', color: '#3B82F6' }}
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            disabled={user.email === session?.user?.email}
                            className="py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-20"
                            style={{ background: '#FEF2F2', color: '#DC2626' }}
                          >
                            ลบ
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}