'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import {
  Menu, X, LayoutDashboard, Truck, Leaf, FileBarChart,
  Settings, Users, LogOut, ChevronRight, Calculator, Search, Navigation
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/driver/jobs', label: 'Load Board', icon: Search, role: 'system_owner' },
  { href: '/admin/trips', label: 'Trip Management', icon: Truck },
  { href: '/admin/active-trips', label: 'Live Tracker', icon: Navigation },
  { href: '/report-center', label: 'Carbon Intelligence', icon: Leaf },
  { href: '/system-owner/modeling', label: 'Financial Modeling', icon: Calculator, role: 'system_owner' },
  { href: '/master-settings', label: 'Master Settings', icon: Settings },
  { href: '/users', label: 'User Access', icon: Users },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className="hidden md:flex w-[260px] flex-col fixed h-full z-30 border-r"
        style={{
          background: 'var(--bg-sidebar)',
          backdropFilter: 'blur(24px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo */}
        <div className="px-6 py-6" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
              }}
            >
              <Leaf className="text-white" size={18} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Autogram
              </h1>
              <p className="text-[11px] font-medium -mt-0.5" style={{ color: 'var(--accent)' }}>
                eco-sync
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.filter(item => !item.role || session?.user?.role === item.role).map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: active ? 'var(--accent-glow)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 500,
                  fontSize: '13.5px',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--border-light)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span className="flex-1">{item.label}</span>
                {active && (
                  <ChevronRight size={14} style={{ opacity: 0.5 }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User / Sign Out */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div
            className="text-xs mb-3 px-2 truncate"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {session?.user?.email || 'User'}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
            style={{
              color: 'var(--text-secondary)',
              background: 'var(--border-light)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
              (e.currentTarget as HTMLElement).style.color = '#DC2626';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--border-light)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Mobile Menu Overlay ─── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside
            className="relative w-[280px] h-full flex flex-col animate-slide-in"
            style={{
              background: 'var(--bg-card)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="px-6 py-5 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                >
                  <Leaf className="text-white" size={16} />
                </div>
                <div>
                  <h1 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Autogram</h1>
                  <p className="text-[11px] font-medium -mt-0.5" style={{ color: 'var(--accent)' }}>eco-sync</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.filter(item => !item.role || session?.user?.role === item.role).map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                    style={{
                      background: active ? 'var(--accent-glow)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 500,
                      fontSize: '14px',
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
              <div className="text-xs mb-3 px-2 truncate" style={{ color: 'var(--text-tertiary)' }}>
                {session?.user?.email || 'User'}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'var(--border-light)' }}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 md:ml-[260px] pb-20 md:pb-0">
        {/* Mobile Header */}
        <div
          className="md:hidden flex items-center justify-between px-4 py-3"
          style={{
            background: 'var(--bg-sidebar)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            >
              <Leaf className="text-white" size={12} />
            </div>
            <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
              Autogram
            </span>
          </div>
          <div className="w-6" />
        </div>

        {children}
      </main>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30"
        style={{
          background: 'var(--bg-sidebar)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex justify-around py-2">
          {[
            { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
            ...(session?.user?.role === 'system_owner' ? [{ href: '/driver/jobs', icon: Search, label: 'Loads' }] : []),
            { href: '/admin/trips', icon: Truck, label: 'Trips' },
            { href: '/report-center', icon: Leaf, label: 'Carbon' },
            { href: '/master-settings', icon: Settings, label: 'Settings' },
          ].map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
