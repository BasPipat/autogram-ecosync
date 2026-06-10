'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag, Share2, ExternalLink, Leaf } from 'lucide-react';

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
  publishedBy?: string;
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  compliance: { bg: '#F3E8FF', color: '#7C3AED' },
  esg: { bg: '#ECFDF5', color: '#059669' },
  logistics: { bg: '#EFF6FF', color: '#3B82F6' },
  announcement: { bg: '#FFF7ED', color: '#C2410C' },
};

export default function SingleNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/news/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.news) setNews(d.news);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-medium">กำลังโหลดเนื้อหา...</p>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">ไม่พบข่าวสารที่คุณต้องการ</h1>
        <p className="text-slate-500 mb-6">ข่าวสารนี้อาจถูกลบไปแล้วหรือที่อยู่ไม่ถูกต้อง</p>
        <Link href="/news" className="px-6 py-2 bg-emerald-500 text-white rounded-full font-bold">
          กลับไปที่คลังข่าวสาร
        </Link>
      </div>
    );
  }

  const cat = CATEGORY_COLORS[news.category] || CATEGORY_COLORS.announcement;

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      {/* Article Header & Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link href="/news" className="group flex items-center gap-2 text-[13px] font-bold text-slate-500 hover:text-emerald-600 transition-colors">
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> ย้อนกลับ
          </Link>
          <div className="flex items-center gap-2 opacity-60">
            <Leaf size={18} className="text-emerald-500" />
            <span className="text-[14px] font-bold">SHIF</span>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
            <Share2 size={18} />
          </button>
        </div>
      </nav>

      {/* Hero Image Section */}
      <section className="mx-auto max-w-4xl pt-8 px-6">
        <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/5">
          <img 
            src={news.imageUrl || `https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2013&auto=format&fit=crop`} 
            alt={news.title}
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Article Content */}
      <article className="mx-auto max-w-4xl px-6 py-12">
        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm"
            style={{ background: cat.bg, color: cat.color }}>
            {news.category}
          </span>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-400">
            <Calendar size={14} />
            {new Date(news.publishedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-400">
            <User size={14} />
            {news.publishedBy || news.source}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.2] mb-8">
          {news.title}
        </h1>

        {/* Summary / Lead */}
        <p className="text-xl text-slate-600 leading-relaxed font-medium mb-10 pb-8 border-b border-slate-100">
          {news.summary}
        </p>

        {/* Body Content */}
        <div className="prose prose-slate prose-lg max-w-none text-slate-700 leading-extra-relaxed">
          {news.content ? (
            <div dangerouslySetInnerHTML={{ __html: news.content.replace(/\n/g, '<br />') }} />
          ) : (
            <div className="space-y-6">
              <p>นี่คือเนื้อหาจำลองสำหรับบทความข่าวสารของ SHIF แพลตฟอร์มบริหารจัดการคาร์บอนที่ทันสมัยที่สุดสำหรับภาคอุตสาหกรรมไทย...</p>
              <p>ในปัจจุบัน มาตรฐานการรายงานด้านความยั่งยืน (ESG) และการคำนวณคาร์บอนฟุตพริ้นท์กำลังเป็นประเด็นสำคัญที่ทุกบริษัทขนส่งไม่สามารถมองข้ามได้ โดยเฉพาะมาตรฐานขององค์การบริหารจัดการก๊าซเรือนกระจก (องค์การมหาชน) หรือ TGO ที่มุ่งเน้นความโปร่งใสและตรวจสอบได้ในทุกขั้นตอน</p>
              <p>บทความนี้จะพาคุณไปทำความเข้าใจถึงความสำคัญของการนำเทคโนโลยี Carbon Intelligence เข้ามาประยุกต์ใช้ เพื่อสร้างความได้เปรียบในการแข่งขันในระยะยาว...</p>
            </div>
          )}
        </div>

        {/* Footer info & External link */}
        <div className="mt-16 p-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-[13px] font-bold text-slate-400 uppercase mb-2">บทความโดย</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Leaf size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">SHIF Editorial Team</p>
                  <p className="text-[12px] text-slate-500">Expert Insights on Sustainability</p>
                </div>
              </div>
            </div>
            {news.externalUrl && (
              <a href={news.externalUrl} target="_blank" rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 text-[14px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100">
                อ่านต้นฉบับข่าวจากแหล่งที่มา <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </article>

      {/* Related News Suggestion could go here */}
    </main>
  );
}
