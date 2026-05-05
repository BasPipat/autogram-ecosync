'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Leaf, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function RequestDemoPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }

      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/');
      }, 4000);
      
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setLoading(false);
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
        className="fixed top-0 right-0 w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div
        className="w-full max-w-[480px] p-8 animate-fade-in relative z-10"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}
      >
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

        {success ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              ส่งข้อมูลสำเร็จ
            </h2>
            <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              เราได้รับข้อมูลของท่านแล้ว ทีมงานจะติดต่อกลับเพื่อทำการนัดหมายโดยเร็วที่สุด
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              กำลังพากลับไปยังหน้าหลัก...
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
              นัดหมายเพื่อสาธิตระบบ
            </h2>
            <p className="text-center text-[13px] mb-8" style={{ color: 'var(--text-tertiary)' }}>
              Request a Demo - Autogram Eco-Sync
            </p>

            {error && (
              <div
                className="mb-6 px-4 py-3 rounded-xl text-[13px]"
                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    ชื่อ - นามสกุล
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={inputStyle}
                    placeholder="กรอกชื่อ-นามสกุลของคุณ"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    ชื่อบริษัท
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={inputStyle}
                    placeholder="กรอกชื่อบริษัทของคุณ"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={inputStyle}
                    placeholder="example@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={inputStyle}
                    placeholder="08X-XXX-XXXX"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 mt-4 rounded-xl text-[14px] font-semibold transition-all disabled:opacity-60"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                }}
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={18} /> กำลังส่งข้อมูล...</>
                ) : (
                  <>ส่งข้อมูล <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="mt-8 text-center pt-6" style={{ borderTop: '1px solid var(--border-light)' }}>
              <Link
                href="/"
                className="text-[13px] font-semibold transition-colors flex items-center justify-center gap-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                กลับหน้าหลัก
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}