import Link from 'next/link';
import { ArrowRight, Leaf, ShieldCheck, Gauge, LineChart } from 'lucide-react';

export default function PublicLandingPage() {
  return (
    <main
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #F7F8FA 0%, #FFFFFF 40%, #F0FDF4 100%)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient orb */}
        <div
          className="absolute top-[-200px] right-[-100px] w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        <div className="mx-auto max-w-5xl px-6 py-24 md:py-32 relative">
          {/* Badge */}
          <p
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              border: '1px solid rgba(16,185,129,0.15)',
            }}
          >
            <Leaf size={13} /> Green Logistics Vision
          </p>

          <h1
            className="mt-6 text-4xl md:text-6xl font-bold leading-tight tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Premium Carbon Intelligence
            <span className="block" style={{ color: 'var(--accent)' }}>
              for Asset-Light Transport
            </span>
          </h1>

          <p
            className="mt-6 max-w-2xl text-[16px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Autogram Eco-Sync ช่วยจัดการงานขนส่ง, Carbon Ledger และความถูกต้องเอกสารในระบบเดียว
            ด้วยประสบการณ์ใช้งานสไตล์พรีเมียมที่เน้นความน่าเชื่อถือระดับองค์กร
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
              }}
            >
              เข้าสู่ระบบ <ArrowRight size={16} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              ดูตัวอย่าง Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24 grid gap-5 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: 'Data Integrity First',
            desc: 'ตรวจสอบ POD และหลักฐานทุกเที่ยวเพื่อยกระดับความน่าเชื่อถือของข้อมูล ESG',
            gradient: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
            iconColor: '#10B981',
          },
          {
            icon: Gauge,
            title: 'Lean Operations',
            desc: 'ออกแบบสำหรับ Asset-Light model ใช้รถร่วม 100% แต่ยังคุมต้นทุนคาร์บอนได้แม่นยำ',
            gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
            iconColor: '#3B82F6',
          },
          {
            icon: LineChart,
            title: 'Executive Reporting',
            desc: 'พร้อมต่อยอดสู่รายงานรายเดือนและ workflow สำหรับ Green Loan และ ESG package',
            gradient: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
            iconColor: '#22C55E',
          },
        ].map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="glass-card p-6"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: feature.gradient }}
              >
                <Icon size={20} style={{ color: feature.iconColor }} />
              </div>
              <h2 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {feature.title}
              </h2>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {feature.desc}
              </p>
            </article>
          );
        })}
      </section>

      {/* Footer */}
      <footer className="py-8 text-center" style={{ borderTop: '1px solid var(--border-light)' }}>
        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          © 2026 Autogram Eco-Sync — Carbon Intelligence Platform
        </p>
      </footer>
    </main>
  );
}