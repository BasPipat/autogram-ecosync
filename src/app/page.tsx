import Link from 'next/link';
import { ArrowRight, Leaf, ShieldCheck, Gauge, LineChart } from 'lucide-react';

export default function PublicLandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_52%)]" />
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Leaf size={14} /> Green Logistics Vision
          </p>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-tight">
            Premium Carbon Intelligence
            <span className="block text-emerald-400">for Asset-Light Transport</span>
          </h1>
          <p className="mt-6 max-w-2xl text-slate-300 text-lg">
            Autogram Eco-Sync ช่วยจัดการงานขนส่ง, Carbon Ledger และความถูกต้องเอกสารในระบบเดียว
            ด้วยประสบการณ์ใช้งานสไตล์พรีเมียมที่เน้นความน่าเชื่อถือระดับองค์กร
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400">
              เข้าสู่ระบบ <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-100 hover:border-slate-500">
              ดูตัวอย่าง Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <ShieldCheck className="text-emerald-400" />
          <h2 className="mt-4 text-xl font-semibold">Data Integrity First</h2>
          <p className="mt-2 text-sm text-slate-400">ตรวจสอบ POD และหลักฐานทุกเที่ยวเพื่อยกระดับความน่าเชื่อถือของข้อมูล ESG</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <Gauge className="text-cyan-400" />
          <h2 className="mt-4 text-xl font-semibold">Lean Operations</h2>
          <p className="mt-2 text-sm text-slate-400">ออกแบบสำหรับ Asset-Light model ใช้รถร่วม 100% แต่ยังคุมต้นทุนคาร์บอนได้แม่นยำ</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <LineChart className="text-emerald-400" />
          <h2 className="mt-4 text-xl font-semibold">Executive Reporting</h2>
          <p className="mt-2 text-sm text-slate-400">พร้อมต่อยอดสู่รายงานรายเดือนและ workflow สำหรับ Green Loan และ ESG package</p>
        </article>
      </section>
    </main>
  );
}