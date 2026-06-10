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
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const englishCompanyName = /^[A-Za-z0-9\s.,&'()/-]+$/;
    const companyName = formData.companyName.trim().replace(/\s+/g, ' ');
    if (!englishCompanyName.test(companyName)) {
      setError('กรุณากรอกชื่อบริษัทเป็นภาษาอังกฤษเท่านั้น เช่น ACME LOGISTICS CO., LTD.');
      return;
    }

    if (formData.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          companyName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }

      setSuccess(true);
      
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
              สมัครสมาชิกสำเร็จ
            </h2>
            <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              ระบบสร้างบัญชีและตั้งค่าเริ่มต้นเป็นลูกค้าเงินสดแล้ว สามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่สมัครไว้
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              กำลังพากลับไปยังหน้าเข้าสู่ระบบ...
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
              สมัครเข้าใช้งานระบบ
            </h2>
            <p className="text-center text-[13px] mb-8" style={{ color: 'var(--text-tertiary)' }}>
              Company name must be English. Default payment term is Cash.
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
                    ชื่อบริษัทภาษาอังกฤษ
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={inputStyle}
                    placeholder="ACME LOGISTICS CO., LTD."
                    pattern="[A-Za-z0-9\s.,&'()/-]+"
                    title="กรุณากรอกชื่อบริษัทเป็นภาษาอังกฤษเท่านั้น"
                    required
                  />
                  <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    ระบบจะตั้งค่าเริ่มต้นเป็นชำระเงินสด
                  </p>
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
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    รหัสผ่าน
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={inputStyle}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    ยืนยันรหัสผ่าน
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={inputStyle}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    minLength={8}
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
                  <><Loader2 className="animate-spin" size={18} /> กำลังสมัครสมาชิก...</>
                ) : (
                  <>สมัครเข้าใช้งาน <ArrowRight size={18} /></>
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
