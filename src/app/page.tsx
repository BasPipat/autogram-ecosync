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
  content?: string;
  category: string;
  source: string;
  externalUrl?: string;
  imageUrl?: string;
  publishedAt: string;
};

const FEATURED_NEWS: NewsItem[] = [
  {
    _id: 'f1',
    title: 'เจาะลึกมาตรฐาน TGO Activity-based Approach สำหรับภาคขนส่งปี 2025',
    summary: 'สรุปประเด็นสำคัญในการคำนวณคาร์บอนฟุตพริ้นท์สำหรับรถบรรทุกขนส่งสินค้า พร้อมตัวอย่างการคำนวณตามมาตรฐานใหม่ล่าสุด',
    content: 'ในการก้าวสู่สังคมคาร์บอนต่ำ มาตรฐาน TGO สำหรับภาคขนส่งปี 2025 เน้นการคำนวณแบบรายเที่ยววิ่ง (Activity-based) เพื่อให้เกิดความแม่นยำสูงสุด...',
    category: 'compliance',
    source: 'TGO Official',
    publishedAt: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop',
    externalUrl: 'https://thaicarbonlabel.tgo.or.th/'
  },
  {
    _id: 'f2',
    title: 'ทำไม ESG ถึงกลายเป็นหัวใจสำคัญของธุรกิจ Logistics ยุคใหม่',
    summary: 'สำรวจแนวโน้มความต้องการของบริษัทข้ามชาติในการเลือกคู่ค้าขนส่งที่มีรายงานการปล่อยก๊าซเรือนกระจกที่โปร่งใส',
    content: 'ปัจจุบันบริษัทระดับโลกให้ความสำคัญกับ Supply Chain Emission เป็นอย่างมาก การมีข้อมูลคาร์บอนที่ตรวจสอบได้จึงเป็นกุญแจสำคัญ...',
    category: 'esg',
    source: 'Logistics Insight',
    publishedAt: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=2041&auto=format&fit=crop',
    externalUrl: 'https://www.set.or.th/th/esg/overview'
  },
  {
    _id: 'f3',
    title: 'Eco-Sync อัปเดตระบบ Carbon Ledger รองรับการเชื่อมต่อ API เต็มรูปแบบ',
    summary: 'ช่วยให้บริษัทขนส่งสามารถเชื่อมต่อข้อมูลจากระบบ TMS หรือ GPS เข้าสู่ระบบ Eco-Sync ได้โดยตรงแบบ Real-time',
    content: 'เราได้พัฒนา API ชุดใหม่ที่ช่วยให้การส่งข้อมูลจากระบบดั้งเดิมเข้าสู่แพลตฟอร์ม Eco-Sync ทำได้โดยอัตโนมัติ ลดข้อผิดพลาดจากมนุษย์...',
    category: 'announcement',
    source: 'Platform Update',
    publishedAt: new Date().toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=2070&auto=format&fit=crop'
  }
];

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
    fetch('/api/public/news').then(r => r.json()).then(d => {
      const apiNews = d.news || [];
      setNews(apiNews.length > 0 ? apiNews : FEATURED_NEWS);
    }).catch(() => {
      setNews(FEATURED_NEWS);
    });

    // --- LIFF Redirect Interceptor ---
    const params = new URLSearchParams(window.location.search);
    const liffState = params.get('liff.state');
    if (liffState) {
      const targetPath = decodeURIComponent(liffState);
      // If the state looks like a path, redirect to it
      if (targetPath.startsWith('/')) {
        router.replace(targetPath);
      }
    }
  }, [router]);

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

              <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
                ระบบบริหารคาร์บอน
                <span className="block text-gradient-emerald">มาตรฐาน TGO</span>
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

              <p className="mt-4 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                นัดหมายเพื่อสาธิตระบบ{' '}
                <a href="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>
                  (Request a Demo)
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ══════════ FEATURES ══════════ */}
      <section className="mx-auto max-w-6xl px-6 pb-24 grid gap-8 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'TGO Compliance', desc: 'คำนวณ Emission ตาม Activity-based Approach พร้อม Audit Trail ทุกเที่ยววิ่ง', gradient: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', iconColor: '#10B981' },
          { icon: Gauge, title: 'Pre-Computed Data', desc: 'Emission คำนวณสำเร็จ ณ วันที่จบงาน — รายงานดึงข้อมูลสำเร็จรูป โหลดไว 10x', gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', iconColor: '#3B82F6' },
          { icon: LineChart, title: 'ESG Executive Report', desc: 'PDF สำหรับผู้บริหาร + Excel สำหรับ Auditor พร้อมสูตร TGO และ GPS-verified distance', gradient: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', iconColor: '#22C55E' },
        ].map(feature => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="glass-card p-8 group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-sm" style={{ background: feature.gradient }}>
                <Icon size={24} style={{ color: feature.iconColor }} />
              </div>
              <h2 className="text-[18px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{feature.title}</h2>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.desc}</p>
            </article>
          );
        })}
      </section>

      {/* ══════════ TGO FORMULA ══════════ */}
      <section className="mx-auto max-w-6xl px-6 pb-24 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="glass-card p-10 text-center relative overflow-hidden" 
          style={{ background: 'linear-gradient(135deg, #FFFFFF, #F0FDF4)', border: '1px solid var(--accent-light)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
            <Leaf size={128} className="text-emerald-500 translate-x-10 -translate-y-10" />
          </div>
          
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100/50 mb-6 text-emerald-600">
            <Leaf size={24} />
          </div>
          
          <h2 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>วิธีคำนวณ Carbon Emission</h2>
          
          <div className="flex flex-col lg:flex-row items-center justify-center gap-5">
            <div className="px-5 py-3 rounded-2xl bg-white border border-emerald-100 shadow-sm">
              <span className="text-[13px] font-bold text-slate-500 block mb-1">Activity Data</span>
              <span className="text-lg font-bold text-emerald-600">น้ำหนัก (Ton) × ระยะทาง (KM)</span>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">=</div>
            
            <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
              <span className="text-[13px] font-bold text-slate-500 block mb-1">Performance Metric</span>
              <span className="text-lg font-bold text-emerald-700">Ton-KM</span>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">×</div>
            
            <div className="px-5 py-3 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
              <span className="text-[13px] font-bold text-slate-500 block mb-1">Emission Factor</span>
              <span className="text-lg font-bold text-blue-600">EF (kgCO₂e/ton-km)</span>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">=</div>
            
            <div className="px-5 py-3 rounded-2xl bg-orange-50 border border-orange-100 shadow-sm ring-2 ring-orange-200/20">
              <span className="text-[13px] font-bold text-slate-500 block mb-1">Total Carbon</span>
              <span className="text-lg font-bold text-orange-600">Emission (kgCO₂e)</span>
            </div>
          </div>
          
          <p className="mt-8 text-[12px] font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            <ShieldCheck size={12} className="inline mr-1" /> Based on TGO Standard — Activity-based Approach for Freight Transport
          </p>
        </div>
      </section>

      {/* ══════════ PARTNERS & TRUST ══════════ */}
      <section className="pb-24 overflow-hidden opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-[11px] font-bold tracking-[0.2em] uppercase mb-8" style={{ color: 'var(--text-tertiary)' }}>
            Trusted by organizations across Thailand
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
            {/* Using text-based logos for demo, usually these would be SVG images */}
            <div className="text-xl font-black text-slate-400">TGO</div>
            <div className="text-xl font-black text-slate-400">Ministry of Transport</div>
            <div className="text-xl font-black text-slate-400">ESG Network</div>
            <div className="text-xl font-black text-slate-400">Logistics Association</div>
            <div className="text-xl font-black text-slate-400">Green Logistics</div>
          </div>
        </div>
      </section>

      {/* ══════════ CALL TO ACTION ══════════ */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="glass-card p-12 text-center relative overflow-hidden bg-glow"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none' }}>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">เริ่มต้นจัดการคาร์บอนกับ Eco-Sync วันนี้</h2>
            <p className="text-emerald-50 mb-8 max-w-xl mx-auto text-lg opacity-90">
              ช่วยให้บริษัทของคุณเป็นผู้นำด้านความยั่งยืน และพร้อมรับมือกับมาตรการ ESG ระดับสากล
            </p>
            <div className="flex justify-center">
              <Link href="/register" className="px-10 py-4 rounded-full bg-white font-bold text-emerald-700 shadow-xl hover:scale-105 transition-transform">
                ลงทะเบียนขอสาธิตระบบ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="py-12 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Leaf size={20} className="text-emerald-500" />
            <span className="font-bold text-[16px]">Autogram Eco-Sync</span>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            © 2026 Autogram Eco-Sync — Carbon Intelligence Platform
          </p>
          <div className="flex gap-6 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Link href="/privacy" className="hover:text-emerald-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-emerald-600">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}