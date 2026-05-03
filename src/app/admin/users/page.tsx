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
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

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
      } else {
        alert('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
      }
    } catch (error) {
      console.error("Role update error:", error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // ฟังก์ชันช่วยกำหนดสีป้ายให้สวยงามตามระดับยศ
  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'superadmin': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">SUPER ADMIN</span>;
      case 'admin': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">ADMIN</span>;
      case 'client_admin': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">CLIENT ADMIN</span>;
      case 'client_user': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">CLIENT USER</span>;
      case 'driver': return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">DRIVER (LINE)</span>;
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
                <th className="p-4 font-semibold w-1/4">ชื่อผู้ใช้ / บริษัท</th>
                <th className="p-4 font-semibold w-1/4">อีเมล</th>
                <th className="p-4 font-semibold w-1/4">สถานะปัจจุบัน</th>
                <th className="p-4 font-semibold w-1/4">ปรับระดับสิทธิ์</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">ไม่พบผู้ใช้งาน</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-800 font-medium">
                      {user.name}
                      {user.companyName && <div className="text-xs text-slate-400 mt-1">🏢 {user.companyName}</div>}
                    </td>
                    <td className="p-4 text-slate-500">{user.email}</td>
                    <td className="p-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="p-4">
                      <select 
                        className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white cursor-pointer w-full max-w-[220px]"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        disabled={user.email === 'l3aspipat@gmail.com'} // บอสล็อกสเปกไว้ไม่ให้ปลดตัวเอง
                      >
                        <optgroup label="--- ฝั่งองค์กรลูกค้า ---">
                          <option value="client_user">Client User (พนักงานประสานงาน)</option>
                          <option value="client_admin">Client Admin (ผู้จัดการลูกค้า)</option>
                        </optgroup>
                        <optgroup label="--- ฝั่งเจ้าหน้าที่ Autogram ---">
                          <option value="admin">Admin (เจ้าหน้าที่ส่วนกลาง)</option>
                          <option value="superadmin">Super Admin (เจ้าของระบบ)</option>
                        </optgroup>
                        <optgroup label="--- ระบบอื่นๆ ---">
                          <option value="driver">Driver (คนขับรถผูก LINE OA)</option>
                        </optgroup>
                      </select>
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