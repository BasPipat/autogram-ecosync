'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowRight, Leaf, ShieldCheck, Gauge, LineChart, TrendingUp, Truck, Building2, Loader2, ExternalLink, Newspaper, Lock, CheckCircle } from 'lucide-react';
import ShifLogo from '@/components/ShifLogo';

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
    title: 'SHIF อัปเดตระบบ Carbon Ledger รองรับการเชื่อมต่อ API เต็มรูปแบบ',
    summary: 'ช่วยให้บริษัทขนส่งสามารถเชื่อมต่อข้อมูลจากระบบ TMS หรือ GPS เข้าสู่ระบบ SHIF ได้โดยตรงแบบ Real-time',
    content: 'เราได้พัฒนา API ชุดใหม่ที่ช่วยให้การส่งข้อมูลจากระบบดั้งเดิมเข้าสู่แพลตฟอร์ม SHIF ทำได้โดยอัตโนมัติ ลดข้อผิดพลาดจากมนุษย์...',
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

  // Interactive Fleet States
  const [selectedVehicle, setSelectedVehicle] = useState<'ev' | 'cng' | 'diesel'>('ev');
  const [calcDistance, setCalcDistance] = useState(120);
  const [calcWeight, setCalcWeight] = useState(8);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryCompany, setInquiryCompany] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/public/stats').then(r => r.json()).then(setStats).catch(() => {});
    fetch('/api/public/news').then(r => r.json()).then(d => {
      const apiNews = d.news || [];
      setNews(apiNews.length > 0 ? apiNews : FEATURED_NEWS);
    }).catch(() => {
      setNews(FEATURED_NEWS);
    });
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
                SHIF จัดการเที่ยววิ่ง, Carbon Ledger และรายงาน ESG ในระบบเดียว
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
                ยังไม่มีบัญชี?{' '}
                <a href="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>
                  สมัครเข้าใช้งาน
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

      {/* ══════════ B2B LOGISTICS MARKETPLACE ══════════ */}
      {/* DARK HERO BANNER */}
      <section className="pb-0 overflow-hidden">
        <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #0D1F0F 60%, #0F172A 100%)' }} className="relative">
          {/* Green ambient glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #10B981, transparent 70%)', filter: 'blur(100px)' }} />
            <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #10B981, transparent 70%)', filter: 'blur(80px)' }} />
          </div>

          <div className="mx-auto max-w-6xl px-6 pt-20 pb-0 relative">
            <div className="grid lg:grid-cols-2 gap-8 items-end">

              {/* Left: Text Content */}
              <div className="pb-16">
                <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase mb-6"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <Truck size={12} /> B2B Industrial Logistics Platform
                </p>

                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
                  เชื่อมต่อโรงงาน<br />
                  <span style={{ color: '#10B981' }}>สู่กองรถเทรลเลอร์</span>
                </h2>

                <p className="text-[15px] leading-relaxed mb-8" style={{ color: '#94A3B8' }}>
                  SHIF คือ B2B Logistics Marketplace ที่เชื่อมต่อโรงงานอุตสาหกรรมกับเครือข่ายรถหัวลาก/เทรลเลอร์โดยตรง
                  พร้อมระบบออกรายงานคาร์บอน Scope 3 อัตโนมัติ รองรับมาตรฐาน CBAM และ ESG ระดับสากล
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => { setInquirySubmitted(false); setShowInquiryModal(true); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[14px] text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
                    <ArrowRight size={16} /> ติดต่อทีมขาย
                  </button>
                  <a href="#b2b-features"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[14px] transition-all hover:bg-white/10"
                    style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#E2E8F0' }}>
                    ดูรายละเอียด
                  </a>
                </div>

                {/* Stat Pills */}
                <div className="grid grid-cols-3 gap-3 mt-10">
                  {[
                    { value: 'B2B', label: 'Industrial Focus' },
                    { value: 'Scope 3', label: 'Carbon Report' },
                    { value: 'ERP', label: 'API Integration' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl py-3 px-3 text-center"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-lg font-black" style={{ color: '#10B981' }}>{s.value}</p>
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: '#64748B' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Truck Image */}
              <div className="relative flex items-end justify-center lg:justify-end h-[340px] lg:h-[420px]">
                {/* Glow under truck */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[80px] rounded-full"
                  style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.3), transparent 70%)', filter: 'blur(20px)' }} />
                <img
                  src="/trailer-truck.png"
                  alt="SHIF Industrial Trailer Truck"
                  className="relative z-10 w-full max-w-[520px] object-contain object-bottom drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 20px 60px rgba(16,185,129,0.2))' }}
                />
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS — 4 Cards */}
      <section id="b2b-features" className="mx-auto max-w-6xl px-6 pt-16 pb-16">
        <div className="text-center mb-10">
          <p className="text-[11px] font-black tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--accent)' }}>
            Why SHIF?
          </p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-800">
            ทำไมโรงงานชั้นนำถึงเลือก SHIF
          </h3>
          <p className="text-[14px] mt-3 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            แก้ปัญหาที่ฝ่ายจัดซื้อและผู้จัดการโลจิสติกส์เผชิญอยู่ทุกวัน จบในแพลตฟอร์มเดียว
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              num: '01',
              icon: Truck,
              color: '#3B82F6',
              bg: '#EFF6FF',
              border: '#DBEAFE',
              title: 'เครือข่ายรถหัวลาก B2B',
              desc: 'โฟกัสเฉพาะรถเทรลเลอร์และรถหัวลากสำหรับงานอุตสาหกรรม ไม่ใช่รถ 4-6 ล้อทั่วไป ให้บริการฝั่ง B2B โดยเฉพาะ',
            },
            {
              num: '02',
              icon: TrendingUp,
              color: '#10B981',
              bg: '#ECFDF5',
              border: '#D1FAE5',
              title: 'Smart Freight Matching',
              desc: 'ระบบจับคู่งานและ Backhaul Optimization อัตโนมัติ ลดปัญหาเดินรถเที่ยวเปล่า ลดต้นทุนโลจิสติกส์รวมได้จริง',
            },
            {
              num: '03',
              icon: LineChart,
              color: '#8B5CF6',
              bg: '#F5F3FF',
              border: '#EDE9FE',
              title: 'CFO Carbon Report (Scope 3)',
              desc: 'ออกรายงานคาร์บอนฟุตพริ้นท์ (Scope 3) อัตโนมัติ รองรับ CBAM, ESG และระบบซื้อขายคาร์บอนเครดิตในอนาคต',
            },
            {
              num: '04',
              icon: ShieldCheck,
              color: '#F59E0B',
              bg: '#FFFBEB',
              border: '#FEF3C7',
              title: 'ERP / API Integration',
              desc: 'เชื่อมต่อ API เข้ากับระบบ ERP ของโรงงานได้โดยตรง รองรับปริมาณข้อมูลมาก สถาปัตยกรรมซอฟต์แวร์ทันสมัย',
            },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i}
                className="group p-6 rounded-[24px] border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                style={{ background: '#FFFFFF', borderColor: f.border }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: f.bg }}>
                    <Icon size={22} style={{ color: f.color }} />
                  </div>
                  <span className="text-[28px] font-black" style={{ color: `${f.color}20` }}>{f.num}</span>
                </div>
                <h4 className="font-black text-[15px] text-slate-800 mb-2 leading-tight">{f.title}</h4>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-[32px] overflow-hidden" style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Table Header */}
          <div className="px-8 pt-8 pb-4 grid grid-cols-3 gap-4 items-center">
            <div className="col-span-1">
              <p className="text-[11px] font-black tracking-widest uppercase mb-1" style={{ color: '#64748B' }}>เปรียบเทียบ</p>
              <h4 className="text-xl font-black text-white">SHIF<br /><span style={{ color: '#10B981' }}>vs ระบบเดิม</span></h4>
            </div>
            <div className="col-span-1 text-center py-2 px-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-[11px] font-black uppercase tracking-wider mb-0.5" style={{ color: '#10B981' }}>SHIF</p>
              <p className="text-[10px]" style={{ color: '#64748B' }}>B2B Platform</p>
            </div>
            <div className="col-span-1 text-center py-2 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] font-black uppercase tracking-wider mb-0.5" style={{ color: '#475569' }}>ระบบเดิม</p>
              <p className="text-[10px]" style={{ color: '#334155' }}>โทรศัพท์ / Line</p>
            </div>
          </div>

          {/* Table Rows */}
          <div className="px-8 pb-8">
            {[
              { feature: 'เครือข่ายรถ B2B อุตสาหกรรม', ecosync: 'เข้าถึงได้ทันที', old: 'หาเองผ่านคนรู้จัก' },
              { feature: 'รายงานคาร์บอน Scope 3 (CFO)', ecosync: 'ออกให้อัตโนมัติ', old: 'ทำมือ ไม่แม่นยำ' },
              { feature: 'Smart Backhaul Matching', ecosync: 'AI-powered อัตโนมัติ', old: 'ไม่มี' },
              { feature: 'ติดตามสถานะ Real-time', ecosync: 'Live GPS ทุกเที่ยว', old: 'โทรถามคนขับเอง' },
              { feature: 'รองรับ CBAM / ESG Audit', ecosync: 'พร้อมใช้งานทันที', old: 'ต้องจ้างที่ปรึกษาเพิ่ม' },
              { feature: 'เชื่อมต่อ ERP / API', ecosync: 'รองรับเต็มรูปแบบ', old: 'ไม่รองรับ' },
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-3 gap-4 py-4 ${i < 5 ? 'border-b' : ''}`}
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <p className="text-[13px] font-semibold" style={{ color: '#CBD5E1' }}>{row.feature}</p>
                <div className="flex items-center justify-center gap-1.5">
                  <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                  <p className="text-[12px] font-bold" style={{ color: '#10B981' }}>{row.ecosync}</p>
                </div>
                <div className="flex items-center justify-center">
                  <p className="text-[12px] font-medium text-center" style={{ color: '#475569' }}>{row.old}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA inside table */}
          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setInquirySubmitted(false); setShowInquiryModal(true); }}
              className="flex-1 py-3 rounded-xl font-black text-[14px] text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.2)' }}>
              <ArrowRight size={16} /> ติดต่อทีมขาย — ขอใบเสนอราคา
            </button>
          </div>
        </div>
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
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">เริ่มต้นจัดการคาร์บอนกับ SHIF วันนี้</h2>
            <p className="text-emerald-50 mb-8 max-w-xl mx-auto text-lg opacity-90">
              ช่วยให้บริษัทของคุณเป็นผู้นำด้านความยั่งยืน และพร้อมรับมือกับมาตรการ ESG ระดับสากล
            </p>
            <div className="flex justify-center">
              <Link href="/register" className="px-10 py-4 rounded-full bg-white font-bold text-emerald-700 shadow-xl hover:scale-105 transition-transform">
                สมัครเข้าใช้งานระบบ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ LINE CONTACT SECTION ══════════ */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="glass-card p-8 md:p-12 border border-slate-100 bg-white" style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
          <div className="grid md:grid-cols-[1fr_200px] gap-8 items-center">
            <div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#06C755]/10 text-[#06C755]">
                Line Support
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mt-3 mb-4">
                ติดต่อฝ่ายบริการลูกค้าผ่าน LINE Official
              </h2>
              <p className="text-[14px] text-slate-500 leading-relaxed mb-6 max-w-xl">
                หากท่านพบปัญหาในการใช้งานระบบ มีข้อสงสัยทางเทคนิค หรือต้องการขอใบเสนอราคาเพิ่มเติม 
                สามารถแอดไลน์เป็นเพื่อนเพื่อติดต่อสอบถามกับเจ้าหน้าที่ได้ในเวลาทำการ 08.00 - 17.00 น.
              </p>
              <div className="flex flex-wrap gap-3">
                <a 
                  href="https://line.me/R/ti/p/%40768lhrgq" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#06C755] hover:bg-[#05b54d] text-white rounded-xl text-[13px] font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  แอด Line Official (@768lhrgq)
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm inline-block">
                <img 
                  src="/line-qr.png" 
                  alt="Line Official QR Code" 
                  className="w-36 h-36 object-cover rounded-lg" 
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-medium">สแกน QR Code เพื่อแอดไลน์</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="py-12 border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center">
            <ShifLogo showTagline={false} variant="light" size="md" />
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            © 2026 SHIF — Carbon Intelligence Platform
          </p>
          <div className="flex gap-6 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Link href="/privacy" className="hover:text-emerald-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-emerald-600">Terms of Service</Link>
          </div>
        </div>
      </footer>

      {/* ══════════ INQUIRY MODAL OVERLAY ══════════ */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/40 animate-fade-in">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden relative p-8 animate-scale-up">
            
            {/* Close Button */}
            <button
              onClick={() => setShowInquiryModal(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors font-bold text-sm"
            >
              ✕
            </button>

            {inquirySubmitted ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle size={32} strokeWidth={2.5} />
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-2">ส่งข้อมูลคำขอสำเร็จแล้ว!</h4>
                <p className="text-[13px] text-slate-500 leading-relaxed px-4">
                  เจ้าหน้าที่ฝ่ายบริการลูกค้าสัมพันธ์สีเขียว (Green Agent) ของ SHIF จะติดต่อกลับหาท่านภายใน 1 ชั่วโมงทำการ
                </p>
                <button
                  onClick={() => setShowInquiryModal(false)}
                  className="mt-6 px-8 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-[13px] rounded-xl transition-all"
                >
                  ปิดหน้าต่างนี้
                </button>
              </div>
            ) : (
              <div>
                <h4 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-1">
                  <Truck size={20} className="text-emerald-500" />
                  ขอใบเสนอราคากองรถขนส่ง
                </h4>
                <p className="text-[12px] text-slate-400 mb-6">กรอกข้อมูลติดต่อเพื่อให้เจ้าหน้าที่เสนอราคาขนส่งสีเขียวพิเศษให้ท่าน</p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setInquirySubmitted(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ชื่อ-นามสกุล ผู้ติดต่อ</label>
                    <input
                      type="text"
                      required
                      value={inquiryName}
                      onChange={e => setInquiryName(e.target.value)}
                      placeholder="เช่น สมชาย ใจดี"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none text-[13px] focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">ชื่อบริษัท/องค์กร</label>
                    <input
                      type="text"
                      required
                      value={inquiryCompany}
                      onChange={e => setInquiryCompany(e.target.value)}
                      placeholder="เช่น บริษัท เอสซีจี จำกัด"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none text-[13px] focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="tel"
                      required
                      value={inquiryPhone}
                      onChange={e => setInquiryPhone(e.target.value)}
                      placeholder="เช่น 0812345678"
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none text-[13px] focus:ring-2 focus:ring-emerald-500/20 bg-slate-50/50 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-bold shadow-lg shadow-emerald-100 transition-all active:scale-[0.98]"
                    >
                      ส่งคำขอใบเสนอราคา
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
