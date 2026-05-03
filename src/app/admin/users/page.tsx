'use client';
import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';

interface IUser {
  _id: string;
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

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', companyName: '', phone: '' });

  useEffect(() => {
    fetchUsers();
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      if (session?.user?.email) {
        setSessionEmail(session.user.email);
      }
    } catch (error) {
      console.error("Failed to fetch session", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentUser = allUsers.find(u => u.email === sessionEmail);

  const displayedUsers = allUsers.filter(user => {
    if (!currentUser) return true; 
    const isAutogramStaff = ['system_owner', 'operator', 'admin', 'superadmin'].includes(currentUser.role);
    if (isAutogramStaff) return true; 
    if (currentUser.role === 'corporate_admin') {
      return user.companyName === currentUser.companyName;
    }
    return false;
  });

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      });
      if (res.ok) fetchUsers(); 
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleEditClick = (user: IUser) => {
    setEditingUserId(user._id);
    setEditForm({
      name: user.name || '',
      companyName: user.companyName || '',
      phone: user.phone || ''
    });
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: editForm.name,
          companyName: editForm.companyName,
          phone: editForm.phone
        }),
      });
      if (res.ok) {
        setEditingUserId(null); 
        fetchUsers(); 
      } else {
        alert('บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (error) {
      alert('ระบบขัดข้อง');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งาน "${userName}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (error) {
      alert('ลบผู้ใช้งานไม่สำเร็จ');
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'system_owner': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">SYSTEM OWNER</span>;
      case 'operator': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">OPERATOR</span>;
      case 'corporate_admin': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">CORPORATE ADMIN</span>;
      case 'coordinator': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">COORDINATOR</span>;
      case 'driver': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">DRIVER</span>;
      default: return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{role.toUpperCase()}</span>;
    }
  };

  return (
    <SidebarLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">⚙️ จัดการสิทธิ์และข้อมูลลูกค้า</h1>
          <p className="text-sm text-slate-500">จัดการข้อมูลผู้ใช้งาน บริษัทที่สังกัด และเบอร์โทรศัพท์สำหรับวางบิล</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200 whitespace-nowrap">
                <th className="p-4 font-semibold w-2/12">ชื่อผู้ใช้</th>
                <th className="p-4 font-semibold w-2/12">บริษัท (สำหรับวางบิล)</th>
                <th className="p-4 font-semibold w-2/12">เบอร์โทรศัพท์</th>
                <th className="p-4 font-semibold w-2/12">อีเมล</th>
                <th className="p-4 font-semibold w-1/12">สถานะ</th>
                <th className="p-4 font-semibold w-2/12">ระดับสิทธิ์</th>
                <th className="p-4 font-semibold w-1/12 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              ) : displayedUsers.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">ไม่พบข้อมูลผู้ใช้งาน</td></tr>
              ) : (
                displayedUsers.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                      ) : (<span className="text-slate-800 font-medium">{user.name}</span>)}
                    </td>

                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="ชื่อบริษัท..." value={editForm.companyName} onChange={(e) => setEditForm({...editForm, companyName: e.target.value})} />
                      ) : (<span className="text-slate-600">{user.companyName || '-'}</span>)}
                    </td>

                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="เบอร์โทร..." value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                      ) : (<span className="text-slate-600">{user.phone || '-'}</span>)}
                    </td>

                    <td className="p-4 text-slate-500 text-sm">{user.email}</td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    
                    <td className="p-4">
                      <select 
                        className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white cursor-pointer w-full max-w-[180px]"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        // 🟢 ยอมให้บอสแก้ตัวเองได้ ถ้าเป็นยศ admin หรือซุปเปอร์แอดมินเก่า
                        disabled={user.email === sessionEmail && user.role === 'system_owner'}
                      >
                        {user.role === 'admin' && <option value="admin" className="text-slate-400">⚠️ Admin (ยศเก่า)</option>}
                        
                        {['system_owner', 'admin', 'superadmin', 'operator'].includes(currentUser?.role || '') && (
                          <optgroup label="Autogram">
                            <option value="system_owner">System Owner</option>
                            <option value="operator">Operator</option>
                          </optgroup>
                        )}
                        <optgroup label="Customer">
                          <option value="corporate_admin">Corp. Admin</option>
                          <option value="coordinator">Coordinator</option>
                        </optgroup>
                        {['system_owner', 'admin', 'superadmin', 'operator'].includes(currentUser?.role || '') && (
                          <optgroup label="Others">
                            <option value="driver">Driver (LINE)</option>
                          </optgroup>
                        )}
                      </select>
                    </td>

                    <td className="p-4 text-center">
                      {editingUserId === user._id ? (
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleSaveEdit(user._id)} className="text-xs px-3 py-1.5 rounded font-medium text-white bg-green-500 hover:bg-green-600">บันทึก</button>
                          <button onClick={() => setEditingUserId(null)} className="text-xs px-3 py-1.5 rounded font-medium text-slate-600 bg-slate-200 hover:bg-slate-300">ยกเลิก</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleEditClick(user)} className="text-xs px-3 py-1.5 rounded font-medium text-blue-600 bg-blue-50 hover:bg-blue-100">แก้ไข</button>
                          <button 
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            disabled={user.email === sessionEmail}
                            className={`text-xs px-3 py-1.5 rounded font-medium ${user.email === sessionEmail ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                          >
                            ลบ
                          </button>
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