'use client';
import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';

// กำหนดหน้าตาข้อมูลผู้ใช้
interface IUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลผู้ใช้ตอนเปิดหน้าเว็บ
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

  // ฟังก์ชันสลับยศ
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      });

      if (res.ok) {
        alert('อัปเดตสิทธิ์การใช้งานสำเร็จ!');
        fetchUsers(); // โหลดข้อมูลตารางใหม่
      } else {
        alert('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
      }
    } catch (error) {
      console.error("Role update error:", error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  return (
    <SidebarLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">⚙️ จัดการผู้ใช้งานระบบ (Set Role)</h1>
          <p className="text-sm text-slate-500">กำหนดสิทธิ์การเข้าถึงข้อมูลของพนักงาน คนขับรถ และลูกค้า</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">ชื่อผู้ใช้ / บริษัท</th>
                <th className="p-4 font-semibold">อีเมล</th>
                <th className="p-4 font-semibold">สถานะปัจจุบัน</th>
                <th className="p-4 font-semibold">เปลี่ยนสิทธิ์ (Role)</th>
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
                    <td className="p-4 text-slate-800 font-medium">{user.name}</td>
                    <td className="p-4 text-slate-500">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'driver' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      {/* Dropdown เปลี่ยนยศ */}
                      <select 
                        className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white cursor-pointer"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        disabled={user.email === 'l3aspipat@gmail.com'} // ล็อกกันบอสปลดแอดมินตัวเอง
                      >
                        <option value="customer">Customer (ลูกค้า)</option>
                        <option value="driver">Driver (คนขับรถ)</option>
                        <option value="admin">Admin (ผู้ดูแลระบบ)</option>
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