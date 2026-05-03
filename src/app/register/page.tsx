'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      alert('สมัครสำเร็จ! ไปหน้าเข้าสู่ระบบกันเลย');
      router.push('/login');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">สมัครสมาชิก</h2>
        <p className="text-center text-slate-500 mb-8">สร้างบัญชี Autogram Eco-Sync</p>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">ชื่อบริษัท / ชื่อผู้ใช้</label>
            <input 
              type="text" 
              className="w-full mt-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">อีเมล</label>
            <input 
              type="email" 
              className="w-full mt-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">รหัสผ่าน</label>
            <input 
              type="password" 
              className="w-full mt-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors">
            ยืนยันการสมัคร
          </button>
        </form>
        
        <p className="mt-4 text-center text-sm text-slate-600">
          มีบัญชีอยู่แล้ว? <a href="/login" className="text-orange-500 hover:underline">เข้าสู่ระบบที่นี่</a>
        </p>
      </div>
    </div>
  );
}