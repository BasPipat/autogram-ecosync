'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setResetUrl('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'เกิดข้อผิดพลาด');
      } else {
        setMessage(data.message || 'ดำเนินการสำเร็จ');
        if (data.resetUrl) setResetUrl(data.resetUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-900">ลืมรหัสผ่าน</h1>
        <p className="mt-2 text-sm text-slate-500">กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน (JWT token)</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
          />
          <button
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'กำลังสร้างลิงก์...' : 'ส่งคำขอรีเซ็ตรหัสผ่าน'}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
        {resetUrl && (
          <a href={resetUrl} className="mt-2 block text-sm text-cyan-700 underline break-all">
            {resetUrl}
          </a>
        )}

        <p className="mt-6 text-sm text-slate-500">
          กลับไป <Link href="/login" className="text-emerald-600 hover:underline">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
}
