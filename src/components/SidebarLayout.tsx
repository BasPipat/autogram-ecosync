'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { Menu, X, Home, Truck, Settings } from 'lucide-react';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const navButton = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`block p-3 rounded-2xl font-semibold transition-all duration-200 ${
        active
          ? 'bg-white/10 text-slate-900 shadow-md'
          : 'text-slate-600 hover:bg-white/5 hover:text-slate-700'
      }`}>
      {label}
    </Link>
  );

  const mobileNavButton = (href: string, icon: React.ReactNode, label: string, active: boolean) => (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
        active
          ? 'bg-[#10b981]/20 text-[#10b981]'
          : 'text-slate-400 hover:text-slate-200'
      }`}>
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F5F7] text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#0a192f] border-r border-slate-200 flex-col fixed h-full shadow-lg z-30">
        <div className="p-6 border-b border-white/10">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-wide text-white">
              Autogram
            </h1>
            <p className="text-sm text-[#10b981] font-medium -mt-1">
              eco-sync
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navButton('/dashboard', 'Dashboard', pathname === '/dashboard')}
          {navButton('/admin/trips', 'Trip Management', pathname === '/admin/trips')}
          {navButton('/carbon-activity', 'Carbon Activity', pathname === '/carbon-activity')}
          {navButton('/report-center', 'Report Center', pathname === '/report-center')}
          {navButton('/master-settings', 'Master Settings', pathname === '/master-settings')}
          {navButton('/admin/users', 'User Access', pathname === '/admin/users')}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-slate-300 mb-3 px-2 truncate">{session?.user?.email || 'User'}</div>
          <button
            onClick={handleLogout}
            className="w-full text-center p-2 rounded-lg text-sm font-medium text-white bg-[#10b981]/20 hover:bg-[#10b981]/30 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 bg-[#0a192f] border-r border-white/10 flex flex-col h-full shadow-lg z-50">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-wide text-white">
                  Autogram
                </h1>
                <p className="text-sm text-[#10b981] font-medium -mt-1">
                  eco-sync
                </p>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navButton('/dashboard', 'Dashboard', pathname === '/dashboard')}
              {navButton('/admin/trips', 'Trip Management', pathname === '/admin/trips')}
              {navButton('/carbon-activity', 'Carbon Activity', pathname === '/carbon-activity')}
              {navButton('/report-center', 'Report Center', pathname === '/report-center')}
              {navButton('/master-settings', 'Master Settings', pathname === '/master-settings')}
              {navButton('/admin/users', 'User Access', pathname === '/admin/users')}
            </nav>

            <div className="p-4 border-t border-white/10">
              <div className="text-xs text-slate-300 mb-3 px-2 truncate">{session?.user?.email || 'User'}</div>
              <button
                onClick={handleLogout}
                className="w-full text-center p-2 rounded-lg text-sm font-medium text-white bg-[#10b981]/20 hover:bg-[#10b981]/30 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 hover:text-slate-900">
            <Menu size={24} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-bold text-slate-900">Autogram</h1>
            <p className="text-xs text-[#10b981]">eco-sync</p>
          </div>
          <div className="w-6"></div> {/* Spacer */}
        </div>

        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 shadow-2xl">
        <div className="flex justify-around py-3">
          {mobileNavButton('/dashboard', <Home size={20} />, 'Home', pathname === '/dashboard')}
          {mobileNavButton('/admin/trips', <Truck size={20} />, 'Trips', pathname === '/admin/trips')}
          {mobileNavButton('/master-settings', <Settings size={20} />, 'Settings', pathname === '/master-settings')}
        </div>
      </nav>
    </div>
  );
}
