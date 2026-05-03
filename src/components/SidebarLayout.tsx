'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm fixed h-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-green-600 flex items-center gap-2">
            🍃 Eco-Sync
          </h2>
          <p className="text-xs text-slate-500 mt-1">Autogram Control Panel</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {/* 🟢 ปุ่มที่ 1: หน้าหลัก */}
          <Link href="/" 
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/' ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            📊 หน้าหลัก (Dashboard)
          </Link>
          
          {/* 🟢 ปุ่มที่ 2: จัดการงานขนส่ง (เพิ่มเข้ามาใหม่!) */}
          <Link href="/admin/trips" 
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/admin/trips' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            🚚 จัดการงานขนส่ง (Trips)
          </Link>

          {/* 🟢 ปุ่มที่ 3: จัดการสิทธิ์ */}
          <Link href="/admin/users" 
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/admin/users' ? 'bg-orange-50 text-orange-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            ⚙️ จัดการสิทธิ์ (Set Role)
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })} 
            className="w-full text-left p-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}