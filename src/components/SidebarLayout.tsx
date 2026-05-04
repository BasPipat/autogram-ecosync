'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shadow-sm fixed h-full">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            🍃 Eco-Sync
          </h2>
          <p className="text-xs text-slate-400 mt-1">Autogram Control Panel</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard"
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/dashboard' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'}`}>
            📊 หน้าหลัก (Dashboard)
          </Link>

          <Link href="/overview"
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/overview' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'}`}>
            🛰️ Overview Map
          </Link>

          <Link href="/carbon-activity"
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/carbon-activity' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'}`}>
            🌿 Carbon Activity
          </Link>

          <Link href="/admin/trips" 
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/admin/trips' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-slate-800'}`}>
            🚚 จัดการงานขนส่ง (Trips)
          </Link>

          <Link href="/operator/trips"
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/operator/trips' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-slate-800'}`}>
            🧭 Operator Trips
          </Link>

          <Link href="/admin/users" 
            className={`block p-3 rounded-lg font-medium transition-colors ${pathname === '/admin/users' ? 'bg-violet-500/20 text-violet-300' : 'text-slate-300 hover:bg-slate-800'}`}>
            ⚙️ จัดการสิทธิ์ (Set Role)
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })} 
            className="w-full text-left p-3 text-rose-300 hover:bg-rose-500/20 rounded-lg font-medium transition-colors"
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