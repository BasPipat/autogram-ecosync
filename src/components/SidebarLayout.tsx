'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

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
      <aside className="w-64 bg-[#0a192f] border-r border-[#112238] flex flex-col fixed h-full shadow-lg">
        <div className="p-6 border-b border-[#112238]">
          <h2 className="text-2xl font-bold tracking-wide text-[#a7f3d0]">
            🍃 Autogram
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">Fleet Intelligence</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navButton('/dashboard', 'Dashboard', pathname === '/dashboard')}
          {navButton('/admin/trips', 'Trip Management', pathname === '/admin/trips')}
          {navButton('/carbon-activity', 'Carbon Activity', pathname === '/carbon-activity')}
          {navButton('/report-center', 'Report Center', pathname === '/report-center')}
          {navButton('/master-settings', 'Master Settings', pathname === '/master-settings')}
          {navButton('/admin/users', 'User Access', pathname === '/admin/users')}
        </nav>

        <div className="p-4 border-t border-[#112238]">
          <div className="text-xs text-slate-400 mb-3 px-2">{session?.user?.email || 'User'}</div>
          <button
            onClick={handleLogout}
            className="w-full text-center p-2 rounded-lg text-sm font-medium text-slate-300 bg-[#10b981]/20 hover:bg-[#10b981]/30 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
}
