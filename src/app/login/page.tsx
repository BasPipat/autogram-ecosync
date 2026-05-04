'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email: identifier,
      password,
      callbackUrl: '/dashboard'
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (result?.ok) {
      router.push(result.url || '/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl border border-slate-200">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-3">เข้าสู่ระบบ</h2>
        <p className="text-center text-slate-500 mb-6">JWT Authentication ด้วย Email หรือ User ID</p>

        {error && <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email หรือ User ID</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full mt-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              placeholder="กรอก Email หรือ User ID"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              placeholder="กรอกรหัสผ่าน"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-cyan-600 hover:underline">
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          ยังไม่มีบัญชี? <a href="/register" className="font-semibold text-emerald-600 hover:underline">สมัครสมาชิก</a>
        </p>
      </div>
    </div>
  );
}
