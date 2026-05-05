'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';
import { Loader2, Shield, Plus, X, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

interface IUser {
  _id: string;
  username?: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
  phone?: string;
}

const ROLE_META: Record<string, { bg: string; color: string; label: string }> = {
  owner:       { bg: '#F3E8FF', color: '#7C3AED', label: 'System Owner' },
  admin:       { bg: '#EEF2FF', color: '#4F46E5', label: 'Admin' },
  operator:    { bg: '#DBEAFE', color: '#2563EB', label: 'Operator' },
  corp_admin:  { bg: '#FFF7ED', color: '#C2410C', label: 'Corp Admin' },
  coordinator: { bg: '#ECFDF5', color: '#059669', label: 'Coordinator' },
};

export default function ManageUsersPage() {
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: '', name: '', companyName: '', phone: '', password: '' });

  // Invite / Add Member state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '', role: 'coordinator', companyName: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch {
      // ignore
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    fetchUsers();
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
          <Loader2 className="animate-spin mr-2" size={18} /> กำลังตรวจสอบสิทธิ์...
        </div>
      </SidebarLayout>
    );
  }

  const currentUser = allUsers.find(u => u.email === session?.user?.email);

  const isOwner = (role?: string) => role === 'system_owner' || role === 'owner';

  const displayedUsers = allUsers.filter(user => {
    if (!currentUser) return false;
    if (isOwner(currentUser.role)) return true;
    if (['admin', 'operator', 'corp_admin'].includes(currentUser.role)) {
      return user.companyName === currentUser.companyName;
    }
    return false;
  });

  // ─── Handlers ───
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

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`ลบ "${userName}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (res.ok) { fetchUsers(); }
      else { const d = await res.json(); alert(d.error); }
    } catch { alert('เกิดข้อผิดพลาด'); }
  };

  const handleInvite = async (e: React.FormEvent) => {
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
    } catch { setInviteError('ระบบขัดข้อง'); }
    finally { setInviting(false); }
  };

  // ─── Styles ───
  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
  };

  const canManage = currentUser && (isOwner(currentUser.role) || currentUser.role === 'admin');

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F3E8FF, #E9D5FF)' }}>
              <Shield size={20} style={{ color: '#7C3AED' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>การจัดการผู้ใช้งาน</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                {displayedUsers.length} สมาชิก {isOwner(currentUser?.role) ? '(ทุกบริษัท — God Mode)' : `(${currentUser?.companyName || ''})`}
              </p>
            </div>
          </div>

          {canManage && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: showInvite ? 'var(--border-light)' : 'var(--accent)', color: showInvite ? 'var(--text-secondary)' : '#fff' }}
            >
              {showInvite ? <><X size={15} /> ยกเลิก</> : <><UserPlus size={15} /> เพิ่มสมาชิก</>}
            </button>
          )}
        </div>

        {/* ─── Invite Form ─── */}
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
                  {currentUser?.role === 'owner' && (
                    <optgroup label="Autogram Internal">
                      <option value="owner">System Owner</option>
                      <option value="admin">Admin</option>
                      <option value="operator">Operator</option>
                    </optgroup>
                  )}
                  {currentUser?.role === 'admin' && (
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

        {/* ─── Table ─── */}
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
                      ไม่พบข้อมูลผู้ใช้งาน — กรุณาตรวจสอบสิทธิ์ผู้ใช้ในฐานข้อมูล
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
                            : <span className="font-mono font-bold text-[12px]" style={{ color: '#3B82F6' }}>{user.username || '—'}</span>
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
                            : <span style={{ color: 'var(--text-secondary)' }}>{user.companyName || '—'}</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          {isEditing
                            ? <input className="w-full p-2 text-[12px] outline-none" style={inputStyle} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                            : <span style={{ color: 'var(--text-secondary)' }}>{user.phone || '—'}</span>
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
                                {isOwner(currentUser?.role) && (
                                  <optgroup label="Autogram Internal">
                                    <option value="owner">System Owner</option>
                                    <option value="admin">Admin</option>
                                    <option value="operator">Operator</option>
                                  </optgroup>
                                )}
                                {currentUser?.role === 'admin' && (
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
      </div>
    </SidebarLayout>
  );
}