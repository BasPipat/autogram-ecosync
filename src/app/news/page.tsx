'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Leaf } from 'lucide-react';

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

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  compliance: { bg: '#F3E8FF', color: '#7C3AED' },
  esg: { bg: '#ECFDF5', color: '#059669' },
  logistics: { bg: '#EFF6FF', color: '#3B82F6' },
  announcement: { bg: '#FFF7ED', color: '#C2410C' },
};

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/news')
      .then(r => r.json())
      .then(d => {
        setNews(d.news || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-600 hover:text-emerald-600 transition-colors">
            <ArrowLeft size={16} /> กลับหน้าหลัก
          </Link>
          <div className="flex items-center gap-2">
            <Leaf size={20} className="text-emerald-500" />
            <span className="font-bold text-slate-900">SHIF News</span>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">ข่าวสารและองค์ความรู้</h1>
        <p className="text-slate-600 max-w-2xl mx-auto px-6">
          อัปเดตความเคลื่อนไหวล่าสุดเกี่ยวกับมาตรฐานคาร์บอนฟุตพริ้นท์, นโยบาย ESG 
          และเทคโนโลยีเพื่อความยั่งยืนในภาคอุตสาหกรรมโลจิสติกส์
        </p>
      </section>

      {/* News Grid */}
      <section className="mx-auto max-w-6xl px-6">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : news.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {news.map(item => {
              const cat = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.announcement;
              return (
                <article key={item._id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 flex flex-col group hover:shadow-lg transition-all">
                  <div className="aspect-[16/9] overflow-hidden">
                    <img 
                      src={item.imageUrl || `https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2013&auto=format&fit=crop`} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={{ background: cat.bg, color: cat.color }}>{item.category}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.publishedAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    <h2 className="text-[16px] font-bold mb-3 line-clamp-2 text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {item.title}
                    </h2>
                    <p className="text-[13px] text-slate-600 leading-relaxed mb-4 line-clamp-3 flex-1">
                      {item.summary}
                    </p>
                    <div className="pt-4 border-t border-slate-50">
                      <Link href={`/news/${item._id}`}
                        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-600">
                        อ่านรายละเอียด <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-400">ขออภัย ยังไม่มีข่าวสารในขณะนี้</p>
          </div>
        )}
      </section>
    </main>
  );
}
