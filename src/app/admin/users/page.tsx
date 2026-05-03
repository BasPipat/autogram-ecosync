'use client';
import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';

interface IUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
}

export default function ManageUsersPage() {
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

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

  // หาข้อมูลของคนที่กำลังใช้งานระบบอยู่
  const currentUser = allUsers.find(u => u.email === sessionEmail);

  // 🟢 คัดกรองรายชื่อ (อัปเดตใหม่: รองรับยศเก่า admin และ superadmin ให้มองเห็นทุกคนด้วย!)
  const displayedUsers = allUsers.filter(user => {
    if (!currentUser) return true; 
    
    // ถ้ายศปัจจุบันคือกลุ่ม Autogram (รวมยศเก่าด้วย) ให้เห็นทุกคน
    const isAutogramStaff = ['system_owner', 'operator', 'admin', 'superadmin'].includes(currentUser.role);
    
    if (isAutogramStaff) {
      return true; 
    }
    
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
      if (res.ok) {
        alert('ปรับเปลี่ยนระดับสิทธิ์สำเร็จ!');
        fetchUsers(); 
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งาน "${userName}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('ลบผู้ใช้งานเรียบร้อยแล้ว');
        fetchUsers();
      }
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
          <h1 className="text-2xl font-bold text-slate-800">⚙️ จัดการสิทธิ์ผู้ใช้งานระบบ (Role Management)</h1>
          <p className="text-sm text-slate-500">กำหนดสิทธิ์การเข้าถึงข้อมูลขององค์กรลูกค้า และเจ้าหน้าที่ส่วนกลาง</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">ชื่อผู้ใช้</th>
                <th className="p-4 font-semibold">บริษัท</th>
                <th className="p-4 font-semibold">อีเมล</th>
                <th className="p-4 font-semibold">สถานะปัจจุบัน</th>
                <th className="p-4 font-semibold">ปรับระดับสิทธิ์</th>
                <th className="p-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              ) : displayedUsers.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">ไม่พบข้อมูลผู้ใช้งาน</td></tr>
              ) : (
                displayedUsers.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-800 font-medium">{user.name}</td>
                    <td className="p-4 text-slate-600">{user.companyName || '-'}</td>
                    <td className="p-4 text-slate-500">{user.email}</td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">
                      <select 
                        className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white cursor-pointer w-full max-w-[220px]"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        disabled={user.email === sessionEmail}
                      >
                        {/* 🟢 อนุญาตให้ System Owner (และแอดมินเก่า) เห็นหมวด Autogram */}
                        {['system_owner', 'admin', 'superadmin'].includes(currentUser?.role || '') && (
                          <optgroup label="--- ฝั่งเจ้าหน้าที่ Autogram ---">
                            <option value="system_owner">System Owner (ผู้ดูแลระบบสูงสุด)</option>
                            <option value="operator">Autogram Operator (เจ้าหน้าที่ส่วนกลาง)</option>
                          </optgroup>
                        )}
                        
                        <optgroup label="--- ฝั่งองค์กรลูกค้า ---">
                          <option value="corporate_admin">Corporate Admin (ผู้จัดการฝั่งลูกค้า)</option>
                          <option value="coordinator">Logistics Coordinator (ผู้ประสานงาน)</option>
                        </optgroup>

                        {['system_owner', 'admin', 'superadmin'].includes(currentUser?.role || '') && (
                          <optgroup label="--- ระบบอื่นๆ ---">
                            <option value="driver">Driver (คนขับรถผ่าน LINE OA)</option>
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        disabled={user.email === sessionEmail}
                        className={`text-sm px-3 py-1 rounded ${user.email === sessionEmail ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-red-600 bg-red-50 hover:bg-red-100 font-medium'}`}
                      >
                        ลบ
                      </button>
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