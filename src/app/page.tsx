'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowRight, Leaf, ShieldCheck, Gauge, LineChart, TrendingUp, Truck, Building2, Loader2, ExternalLink, Newspaper, Lock } from 'lucide-react';

type Stats = {
  totalTrips: number;
  verifiedTrips: number;
  totalDistanceKm: number;
  totalCarbonKg: number;
  companyCount: number;
};

type NewsItem = {
  _id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  externalUrl?: string;
  publishedAt: string;
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  compliance: { bg: '#F3E8FF', color: '#7C3AED' },
  esg: { bg: '#ECFDF5', color: '#059669' },
  logistics: { bg: '#EFF6FF', color: '#3B82F6' },
  announcement: { bg: '#FFF7ED', color: '#C2410C' },
};

export default function LandingPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    fetch('/api/public/stats').then(r => r.json()).then(setStats).catch(() => {});
    fetch('/api/public/news').then(r => r.json()).then(d => setNews(d.news || [])).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoginLoading(false);
    if (res?.error) { setLoginError('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); }
    else { router.push('/dashboard'); }
  };

  const inputStyle = {
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #F7F8FA 0%, #FFFFFF 40%, #F0FDF4 100%)', color: 'var(--text-primary)' }}>

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute top-[-200px] right-[-100px] w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)', filter: 'blur(80px)' }} />

        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 relative">
          <div className="grid md:grid-cols-[1fr_380px] gap-12 items-start">

            {/* Left: Hero Content */}
            <div>
              <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{ background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <Leaf size={13} /> Carbon Intelligence for Thai Logistics
              </p>

              <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
                ระบบบริหารคาร์บอน
                <span className="block" style={{ color: 'var(--accent)' }}>มาตรฐาน TGO</span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Autogram Eco-Sync จัดการเที่ยววิ่ง, Carbon Ledger และรายงาน ESG ในระบบเดียว
                พร้อมคำนวณ Emission ตามสูตร TGO Activity-based Approach อัตโนมัติ
              </p>

              {/* Trust Stats */}
              {stats && (
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { value: stats.totalTrips.toLocaleString(), label: 'Total Trips', icon: Truck },
                    { value: `${stats.totalCarbonKg.toFixed(0)}`, label: 'kgCO₂e Tracked', icon: Leaf },
                    { value: `${stats.totalDistanceKm.toLocaleString()}`, label: 'km Verified', icon: TrendingUp },
                    { value: String(stats.companyCount), label: 'Companies', icon: Building2 },
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="glass-card p-4 text-center">
                        <Icon size={16} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                        <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Floating Login */}
            <div className="card p-6 sticky top-8" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Lock size={16} style={{ color: 'var(--accent)' }} />
                <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>เข้าสู่ระบบ</h3>
              </div>

              {loginError && (
                <div className="mb-3 px-3 py-2 rounded-xl text-[12px]" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>อีเมล</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>รหัสผ่าน</label>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="รหัสผ่าน"
                    className="w-full px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/20" style={inputStyle} />
                </div>
                <button type="submit" disabled={loginLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                  {loginLoading ? <Loader2 className="animate-spin" size={15} /> : <ArrowRight size={15} />}
                  {loginLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>

              <p className="mt-3 text-center text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                ยังไม่มีบัญชี? <Link href="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>สมัครสมาชิก</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ NEWS HUB ══════════ */}
      {news.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FFF7ED' }}>
              <Newspaper size={16} style={{ color: '#C2410C' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>News & Knowledge Hub</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {news.slice(0, 3).map(item => {
              const cat = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.announcement;
              return (
                <article key={item._id} className="glass-card p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                      style={{ background: cat.bg, color: cat.color }}>{item.category}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(item.publishedAt).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-bold mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                  <p className="text-[12px] leading-relaxed flex-1 line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{item.summary}</p>
                  {item.externalUrl && (
                    <a href={item.externalUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                      อ่านต่อ <ExternalLink size={11} />
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════ FEATURES ══════════ */}
      <section className="mx-auto max-w-6xl px-6 pb-16 grid gap-5 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'TGO Compliance', desc: 'คำนวณ Emission ตาม Activity-based Approach พร้อม Audit Trail ทุกเที่ยววิ่ง', gradient: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', iconColor: '#10B981' },
          { icon: Gauge, title: 'Pre-Computed Data', desc: 'Emission คำนวณสำเร็จ ณ วันที่จบงาน — รายงานดึงข้อมูลสำเร็จรูป โหลดไว 10x', gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', iconColor: '#3B82F6' },
          { icon: LineChart, title: 'ESG Executive Report', desc: 'PDF สำหรับผู้บริหาร + Excel สำหรับ Auditor พร้อมสูตร TGO และ GPS-verified distance', gradient: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', iconColor: '#22C55E' },
        ].map(feature => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="glass-card p-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: feature.gradient }}>
                <Icon size={20} style={{ color: feature.iconColor }} />
              </div>
              <h2 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{feature.title}</h2>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.desc}</p>
            </article>
          );
        })}
      </section>

      {/* ══════════ TGO FORMULA ══════════ */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="card p-8 text-center" style={{ border: '2px solid var(--accent-light)', background: 'linear-gradient(135deg, #FFFFFF, #F0FDF4)' }}>
          <Leaf className="mx-auto mb-4" size={28} style={{ color: 'var(--accent)' }} />
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>วิธีคำนวณ Carbon Emission</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-[14px] font-mono"
            style={{ color: 'var(--text-secondary)' }}>
            <span className="px-3 py-1 rounded-lg" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              น้ำหนัก (Ton) × ระยะทาง (KM)
            </span>
            <span className="font-bold text-lg">=</span>
            <span className="font-bold" style={{ color: 'var(--accent)' }}>Ton-KM</span>
            <span className="font-bold text-lg">×</span>
            <span className="px-3 py-1 rounded-lg" style={{ background: '#EFF6FF', color: '#3B82F6' }}>EF (kgCO₂e/ton-km)</span>
            <span className="font-bold text-lg">=</span>
            <span className="px-3 py-1 rounded-lg font-bold" style={{ background: '#FFF7ED', color: '#C2410C' }}>Emission (kgCO₂e)</span>
          </div>
          <p className="mt-4 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            Based on TGO Standard — Activity-based Approach for Freight Transport
          </p>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="py-8 text-center" style={{ borderTop: '1px solid var(--border-light)' }}>
        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          © 2026 Autogram Eco-Sync — Carbon Intelligence Platform
        </p>
      </footer>
    </main>
  );
}