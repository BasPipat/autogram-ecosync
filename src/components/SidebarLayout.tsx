'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const navButton = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`block p-3 rounded-2xl font-semibold transition-all duration-200 ${
        active
          ? 'bg-[#10b981]/20 text-[#a7f3d0] border border-[#10b981]/30 shadow-[0_12px_30px_-18px_rgba(16,185,129,0.9)]'
          : 'text-slate-300 hover:bg-[#13233b] hover:text-[#d1fae5]'
      }`}>
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-[#071022] text-slate-100">
      <aside className="w-72 bg-[#0a192f] border-r border-[#112138] flex flex-col shadow-[8px_0_30px_-24px_rgba(0,0,0,0.5)] fixed h-full">
        <div className="p-6 border-b border-[#112138]">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#a7f3d0] flex items-center gap-3">
            <span>🍃</span> Eco-Sync
          </h2>
          <p className="text-xs text-slate-500 mt-2">Autogram Premium Logistics</p>
        </div>

        <nav className="flex-1 p-5 space-y-3">
          {navButton('/dashboard', '📊 หน้าหลัก (Dashboard)', pathname === '/dashboard')}
          {navButton('/overview', '🛰️ Overview Map', pathname === '/overview')}
          {navButton('/carbon-activity', '🌿 Carbon Activity', pathname === '/carbon-activity')}
          {navButton('/master-settings', '🛠️ Master Settings', pathname === '/master-settings')}
          {navButton('/report-center', '📁 Report Center', pathname === '/report-center')}
          {navButton('/admin/trips', '🚚 จัดการงานขนส่ง (Trips)', pathname === '/admin/trips')}
          {navButton('/operator/trips', '🧭 Operator Trips', pathname === '/operator/trips')}
          {navButton('/admin/users', '⚙️ จัดการสิทิ (Set Role)', pathname === '/admin/users')}
        </nav>

        <div className="p-5 border-t border-[#112138]">
          <button
            onClick={handleLogout}
            className="w-full text-left p-3 rounded-2xl font-semibold text-[#bef264] bg-[#0c1d35] hover:bg-[#112138] transition-colors"
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-72 p-8">{children}</main>
    </div>
  );
}
