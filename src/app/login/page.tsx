'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Leaf, ArrowRight, Loader2 } from 'lucide-react';

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

  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #F7F8FA 0%, #EEF2F7 50%, #F0FDF4 100%)',
      }}
    >
      {/* Subtle background decoration */}
      <div
        className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div
        className="w-full max-w-[420px] p-8 animate-fade-in"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
            }}
          >
            <Leaf className="text-white" size={22} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
          เข้าสู่ระบบ
        </h2>
        <p className="text-center text-[13px] mb-6" style={{ color: 'var(--text-tertiary)' }}>
          Autogram Eco-Sync Platform
        </p>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-[13px]"
            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              Email หรือ User ID
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
              style={inputStyle}
              placeholder="กรอก Email หรือ User ID"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
              style={inputStyle}
              placeholder="กรอกรหัสผ่าน"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
            }}
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={16} /> กำลังเข้าสู่ระบบ...</>
            ) : (
              <>เข้าสู่ระบบ <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/forgot-password"
            className="text-[12px] font-medium transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <p className="mt-4 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          ยังไม่มีบัญชี?{' '}
          <a href="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>
            สมัครสมาชิก
          </a>
        </p>
      </div>
    </div>
  );
}
