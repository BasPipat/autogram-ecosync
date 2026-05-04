'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (password !== confirmPassword) {
      setMessage('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
      } else {
        setMessage('รีเซ็ตรหัสผ่านสำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...');
        setTimeout(() => router.push('/login'), 1200);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-900">ตั้งรหัสผ่านใหม่</h1>
        <p className="mt-2 text-sm text-slate-500">กรอกรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่านใหม่"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="ยืนยันรหัสผ่านใหม่"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
          <button
            disabled={loading || !token}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'กำลังบันทึก...' : 'ยืนยันการเปลี่ยนรหัสผ่าน'}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
      </div>
    </div>
  );
}
