'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SidebarLayout from '@/components/SidebarLayout';

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

  const currentUser = allUsers.find(u => u.email === session?.user?.email);

  const displayedUsers = allUsers.filter(user => {
    if (!currentUser) return true;
    const isAutogram = ['system_owner', 'operator', 'admin', 'superadmin'].includes(currentUser.role);
    if (isAutogram) return true;
    if (currentUser.role === 'corporate_admin') return user.companyName === currentUser.companyName;
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
    switch(role) {
      case 'system_owner': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">System Owner</span>;
      case 'operator': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">Operator</span>;
      case 'corporate_admin': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 uppercase">Corp Admin</span>;
      case 'coordinator': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">Coordinator</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">{role}</span>;
    }
  };

  return (
    <SidebarLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">⚙️ การจัดการผู้ใช้งานและสิทธิ์</h1>
        <p className="text-sm text-slate-500 mb-6">ตั้งค่า User ID สำหรับ Login และข้อมูลติดต่อสำหรับวางบิลลูกค้า</p>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200 uppercase tracking-widest">
                <th className="p-4 font-bold">User ID (Login)</th>
                <th className="p-4 font-bold">ชื่อผู้ใช้</th>
                <th className="p-4 font-bold">บริษัท (วางบิล)</th>
                <th className="p-4 font-bold">เบอร์โทรศัพท์</th>
                <th className="p-4 font-bold">อีเมล</th>
                <th className="p-4 font-bold text-orange-600">Password ใหม่</th>
                <th className="p-4 font-bold">ระดับสิทธิ์</th>
                <th className="p-4 font-bold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400">กำลังดึงข้อมูลล่าสุด...</td></tr>
              ) : displayedUsers.map((user) => (
                <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    {editingUserId === user._id ? (
                      <input type="text" className="w-full p-2 border border-blue-300 rounded bg-blue-50 outline-none" value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} />
                    ) : (<span className="font-mono font-bold text-blue-600">{user.username || '-'}</span>)}
                  </td>
                  <td className="p-4">
                    {editingUserId === user._id ? (
                      <input type="text" className="w-full p-2 border rounded outline-none" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                    ) : (<span className="font-medium text-slate-800">{user.name}</span>)}
                  </td>
                  <td className="p-4">
                    {editingUserId === user._id ? (
                      <input type="text" className="w-full p-2 border rounded outline-none" value={editForm.companyName} onChange={(e) => setEditForm({...editForm, companyName: e.target.value})} />
                    ) : (user.companyName || '-')}
                  </td>
                  <td className="p-4">
                    {editingUserId === user._id ? (
                      <input type="text" className="w-full p-2 border rounded outline-none" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                    ) : (user.phone || '-')}
                  </td>
                  <td className="p-4 text-slate-400 text-xs">{user.email}</td>
                  <td className="p-4">
                    {editingUserId === user._id ? (
                      <input type="text" className="w-full p-2 border border-orange-200 rounded bg-orange-50 outline-none" placeholder="รหัสผ่านใหม่..." value={editForm.password} onChange={(e) => setEditForm({...editForm, password: e.target.value})} />
                    ) : (<span className="text-slate-200">********</span>)}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      {getRoleBadge(user.role)}
                      <select 
                        className="mt-1 p-1.5 border rounded text-[11px] outline-none bg-white cursor-pointer"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        disabled={user.email === session?.user?.email && (user.role === 'system_owner' || user.role === 'admin')}
                      >
                        {['system_owner', 'admin', 'operator'].includes(currentUser?.role || '') && (
                          <optgroup label="ฝั่ง Autogram">
                            <option value="system_owner">System Owner</option>
                            <option value="operator">Operator</option>
                          </optgroup>
                        )}
                        <optgroup label="ฝั่งลูกค้า">
                          <option value="corporate_admin">Corporate Admin</option>
                          <option value="coordinator">Coordinator</option>
                        </optgroup>
                      </select>
                    </div>
                  </td>
                  <td className="p-4">
                    {editingUserId === user._id ? (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleSaveEdit(user._id)} className="bg-green-600 text-white py-1.5 rounded text-xs font-bold">บันทึก</button>
                        <button onClick={() => setEditingUserId(null)} className="bg-slate-200 text-slate-600 py-1.5 rounded text-xs">ยกเลิก</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleEditClick(user)} className="text-blue-600 bg-blue-50 border border-blue-100 py-1.5 rounded text-xs font-bold hover:bg-blue-100">แก้ไข</button>
                        <button onClick={() => handleDeleteUser(user._id, user.name)} disabled={user.email === session?.user?.email} className="text-red-600 bg-red-50 border border-red-100 py-1.5 rounded text-xs font-bold disabled:opacity-20 hover:bg-red-100">ลบ</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}