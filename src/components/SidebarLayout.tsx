'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  Menu, X, LayoutDashboard, Truck, Leaf, FileBarChart,
  Settings, Users, LogOut, ChevronRight, Calculator, Search, Navigation, DollarSign
} from 'lucide-react';
import ShifLogo from '@/components/ShifLogo';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/driver/jobs', label: 'Load Board', icon: Search, role: 'system_owner' },
  { href: '/admin/trips', label: 'Trip Management', icon: Truck },
  { href: '/admin/active-trips', label: 'Live Tracker', icon: Navigation, role: 'system_owner' },
  { href: '/admin/billing', label: 'Billing & Payments', icon: DollarSign, alertKey: 'billing' },
  { href: '/report-center', label: 'Carbon Intelligence', icon: Leaf },
  { href: '/system-owner/modeling', label: 'Financial Modeling', icon: Calculator, role: 'system_owner' },
  { href: '/master-settings', label: 'Master Settings', icon: Settings },
  { href: '/users', label: 'User Access', icon: Users },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [paymentAlerts, setPaymentAlerts] = useState({ driverPayouts: 0, pendingSlips: 0, total: 0 });

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/admin/payment-alerts');
        if (res.ok) {
          const data = await res.json();
          setPaymentAlerts(data);
        }
      } catch { /* silent */ }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const isActive = (href: string) => pathname === href;

  const getBadgeCount = (alertKey?: string) => {
    if (alertKey === 'billing') return paymentAlerts.total;
    return 0;
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-base)' }}>
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
        <div className="px-6 py-5 flex items-center justify-start" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <Link href="/dashboard" className="flex items-center">
            <ShifLogo showTagline={false} variant="color" size="md" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.filter(item => {
            if (item.role && session?.user?.role !== item.role) return false;
            if (item.href === '/master-settings' && !['system_owner', 'owner', 'admin', 'operator', 'corp_admin'].includes(session?.user?.role || '')) return false;
            if (item.href === '/users' && !['system_owner', 'owner', 'admin', 'operator', 'corp_admin'].includes(session?.user?.role || '')) return false;
            return true;
          }).map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const badge = getBadgeCount(item.alertKey);
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
                {badge > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                {active && badge === 0 && (
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
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
                <ShifLogo showTagline={false} variant="color" size="md" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.filter(item => {
                if (item.role && session?.user?.role !== item.role) return false;
                if (item.href === '/master-settings' && !['system_owner', 'owner', 'admin', 'operator', 'corp_admin'].includes(session?.user?.role || '')) return false;
                if (item.href === '/users' && !['system_owner', 'owner', 'admin', 'operator', 'corp_admin'].includes(session?.user?.role || '')) return false;
                return true;
              }).map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                const badge = getBadgeCount(item.alertKey);
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
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
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
      <main className="flex-1 min-w-0 w-full overflow-x-hidden md:ml-[260px] pb-20 md:pb-0">
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
          <div className="flex items-center justify-center">
            <ShifLogo showTagline={false} variant="color" size="md" />
          </div>
          {/* Billing alert dot for mobile header */}
          {paymentAlerts.total > 0 ? (
            <Link href="/admin/billing" className="relative">
              <DollarSign size={22} style={{ color: 'var(--text-secondary)' }} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center">
                {paymentAlerts.total > 9 ? '9+' : paymentAlerts.total}
              </span>
            </Link>
          ) : (
            <div className="w-6" />
          )}
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
            ...(['system_owner', 'owner', 'admin', 'operator', 'corp_admin'].includes(session?.user?.role || '') ? [{ href: '/master-settings', icon: Settings, label: 'Settings' }] : []),
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
