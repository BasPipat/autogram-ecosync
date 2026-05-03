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
  const [editForm, setEditForm] = useState({ name: '', companyName: '', phone: '', password: '' });

  useEffect(() => {
    fetchUsers();
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      if (session?.user?.email) setSessionEmail(session.user.email);
    } catch (error) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (error) {} finally { setLoading(false); }
  };

  const currentUser = allUsers.find(u => u.email === sessionEmail);
  const displayedUsers = allUsers.filter(user => {
    if (!currentUser) return true;
    const isAutogramStaff = ['system_owner', 'operator', 'admin', 'superadmin'].includes(currentUser.role);
    if (isAutogramStaff) return true;
    return user.companyName === currentUser.companyName;
  });

  const handleEditClick = (user: IUser) => {
    setEditingUserId(user._id);
    setEditForm({
      name: user.name || '',
      companyName: user.companyName || '',
      phone: user.phone || '',
      password: '' // เคลียร์ช่องรหัสผ่านให้ว่างไว้เสมอตอนเริ่มแก้
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
          phone: editForm.phone,
          password: editForm.password // ส่งรหัสผ่านใหม่ไป (ถ้ามี)
        }),
      });
      if (res.ok) {
        setEditingUserId(null);
        fetchUsers();
        alert('บันทึกข้อมูลเรียบร้อย!');
      }
    } catch (error) { alert('เกิดข้อผิดพลาด'); }
  };

  return (
    <SidebarLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">⚙️ จัดการข้อมูลผู้ใช้งาน</h1>
          <p className="text-sm text-slate-500">จัดการ ID, รหัสผ่าน และข้อมูลบริษัทสำหรับลูกค้าทุกราย</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">User ID</th>
                <th className="p-4 font-semibold">ชื่อผู้ใช้</th>
                <th className="p-4 font-semibold">บริษัท</th>
                <th className="p-4 font-semibold">เบอร์โทร</th>
                <th className="p-4 font-semibold">อีเมล</th>
                <th className="p-4 font-semibold">Password ใหม่</th>
                <th className="p-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">กำลังโหลด...</td></tr>
              ) : (
                displayedUsers.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    
                    {/* 🟢 แสดง ID (เอาเฉพาะ 6 ตัวท้ายเพื่อให้ดูง่าย) */}
                    <td className="p-4 font-mono text-xs text-slate-400">
                      #{user._id.substring(user._id.length - 6).toUpperCase()}
                    </td>

                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input type="text" className="w-full p-2 border rounded text-sm" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                      ) : (<span className="text-slate-800 font-medium">{user.name}</span>)}
                    </td>

                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input type="text" className="w-full p-2 border rounded text-sm" value={editForm.companyName} onChange={(e) => setEditForm({...editForm, companyName: e.target.value})} />
                      ) : (<span className="text-slate-600">{user.companyName || '-'}</span>)}
                    </td>

                    <td className="p-4 text-slate-600 text-sm">
                      {editingUserId === user._id ? (
                        <input type="text" className="w-full p-2 border rounded text-sm" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                      ) : (user.phone || '-')}
                    </td>

                    <td className="p-4 text-slate-500 text-sm">{user.email}</td>

                    {/* 🟢 ช่องแก้ Password */}
                    <td className="p-4">
                      {editingUserId === user._id ? (
                        <input 
                          type="text" 
                          className="w-full p-2 border border-orange-200 rounded text-sm bg-orange-50" 
                          placeholder="พิมพ์เพื่อตั้งรหัสใหม่..."
                          value={editForm.password} 
                          onChange={(e) => setEditForm({...editForm, password: e.target.value})} 
                        />
                      ) : (<span className="text-slate-300">********</span>)}
                    </td>

                    <td className="p-4 text-center">
                      {editingUserId === user._id ? (
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handleSaveEdit(user._id)} className="text-xs px-3 py-1 bg-green-500 text-white rounded">บันทึก</button>
                          <button onClick={() => setEditingUserId(null)} className="text-xs px-3 py-1 bg-slate-200 rounded">ยกเลิก</button>
                        </div>
                      ) : (
                        <button onClick={() => handleEditClick(user)} className="text-xs px-4 py-1.5 bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100 font-medium">แก้ไขข้อมูล</button>
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