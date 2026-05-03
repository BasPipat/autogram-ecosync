'use client';
import { useEffect, useState } from 'react';
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
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // การจัดการแก้ไข
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: '', name: '', companyName: '', phone: '', password: '' });

  useEffect(() => {
    fetchUsers();
    fetchSession();
  }, []);

  const fetchSession = async () => {
    const res = await fetch('/api/auth/session');
    const session = await res.json();
    if (session?.user?.email) setSessionEmail(session.user.email);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const currentUser = allUsers.find(u => u.email === sessionEmail);

  // คัดกรองสิทธิ์การมองเห็น
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
        setEditingUserId(null);
        fetchUsers();
        alert('บันทึกข้อมูลเรียบร้อยครับ!');
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) { alert('ระบบขัดข้อง'); }
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
    if (!confirm(`ยืนยันการลบผู้ใช้: ${userName}?`)) return;
    const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
    if (res.ok) fetchUsers();
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'system_owner': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">SYSTEM OWNER</span>;
      case 'operator': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">OPERATOR</span>;
      case 'corporate_admin': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">CORP ADMIN</span>;
      case 'coordinator': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">COORDINATOR</span>;
      case 'admin': return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">ADMIN (OLD)</span>;
      default: return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{role.toUpperCase()}</span>;
    }
  };

  return (
    <SidebarLayout>
      <div className="p-8">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">⚙️ การจัดการผู้ใช้งานและสิทธิ์</h1>
            <p className="text-sm text-slate-500">จัดการข้อมูลบริษัท เบอร์โทรศัพท์ และรหัสผ่านสำหรับวางบิลลูกค้า</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200 uppercase tracking-wider">
                <th className="p-4 font-semibold">User ID</th>
                <th className="p-4 font-semibold">ชื่อผู้ใช้</th>
                <th className="p-4 font-semibold">บริษัท</th>
                <th className="p-4 font-semibold">เบอร์โทรศัพท์</th>
                <th className="p-4 font-semibold">อีเมล</th>
                <th className="p-4 font-semibold">Password ใหม่</th>
                <th className="p-4 font-semibold">ระดับสิทธิ์</th>
                <th className="p-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400">กำลังโหลด...</td></tr>
              ) : (
                displayedUsers.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input type="text" className="w-full p-2 border border-blue-200 rounded bg-blue-50 outline-none" value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} />
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
                    <td className="p-4 text-slate-400">{user.email}</td>
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input type="text" className="w-full p-2 border border-orange-200 rounded bg-orange-50 outline-none" placeholder="ใส่รหัสใหม่..." value={editForm.password} onChange={(e) => setEditForm({...editForm, password: e.target.value})} />
                      ) : (<span className="text-slate-200">********</span>)}
                    </td>
                    <td className="p-4 flex flex-col gap-1">
                      {getRoleBadge(user.role)}
                      <select 
                        className="mt-1 p-1.5 border rounded-lg text-xs outline-none bg-white"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        disabled={user.email === sessionEmail && user.role === 'system_owner'}
                      >
                        {['system_owner', 'admin', 'operator'].includes(currentUser?.role || '') && (
                          <optgroup label="Autogram">
                            <option value="system_owner">System Owner</option>
                            <option value="operator">Operator</option>
                          </optgroup>
                        )}
                        <optgroup label="Customer">
                          <option value="corporate_admin">Corporate Admin</option>
                          <option value="coordinator">Coordinator</option>
                        </optgroup>
                      </select>
                    </td>
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleSaveEdit(user._id)} className="bg-green-600 text-white py-1 rounded text-xs">บันทึก</button>
                          <button onClick={() => setEditingUserId(null)} className="bg-slate-200 text-slate-600 py-1 rounded text-xs">ยกเลิก</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleEditClick(user)} className="text-blue-600 bg-blue-50 border border-blue-100 py-1 rounded text-xs font-medium">แก้ไข</button>
                          <button onClick={() => handleDeleteUser(user._id, user.name)} disabled={user.email === sessionEmail} className="text-red-600 bg-red-50 border border-red-100 py-1 rounded text-xs font-medium disabled:opacity-30">ลบ</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}