'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Leaf, UserPlus, Loader2, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    setLoading(false);

    if (res.ok) {
      alert('สมัครสำเร็จ! ไปหน้าเข้าสู่ระบบกันเลย');
      router.push('/login');
    } else {
      const data = await res.json();
      setError(data.error);
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
      <div
        className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)',
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
            <UserPlus className="text-white" size={22} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
          สมัครสมาชิก
        </h2>
        <p className="text-center text-[13px] mb-6" style={{ color: 'var(--text-tertiary)' }}>
          สร้างบัญชี Autogram Eco-Sync
        </p>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-[13px] text-center"
            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              ชื่อบริษัท / ชื่อผู้ใช้
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
              style={inputStyle}
              onChange={(e) => setName(e.target.value)}
              placeholder="กรอกชื่อบริษัทหรือชื่อผู้ใช้"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              อีเมล
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
              style={inputStyle}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@company.com"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
              รหัสผ่าน
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
              style={inputStyle}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ตั้งรหัสผ่าน"
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
              <><Loader2 className="animate-spin" size={16} /> กำลังสมัคร...</>
            ) : (
              'ยืนยันการสมัคร'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>
            เข้าสู่ระบบที่นี่
          </Link>
        </p>
      </div>
    </div>
  );
}