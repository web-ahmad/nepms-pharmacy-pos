'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import {
  LayoutDashboard,
  Building2,
  Image as ImageIcon,
  CreditCard,
  Tag,
  DollarSign,
  Share2,
  Globe,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Shield,
  Sparkles,
  Menu,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

// ── Nav structure ──────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
    ],
  },
  {
    key: 'management',
    label: 'Management',
    items: [
      { label: 'Pharmacies',       href: '/super-admin/pharmacies',       icon: Building2 },
      { label: 'Media Library',    href: '/super-admin/media',            icon: ImageIcon },
      { label: 'Plans',            href: '/super-admin/plans',            icon: CreditCard },
      { label: 'Coupons',          href: '/super-admin/coupons',          icon: Tag },
      { label: 'Currency',         href: '/super-admin/currency',         icon: DollarSign },
      { label: 'Referral Program', href: '/super-admin/referral',         icon: Share2 },
    ],
  },
  {
    key: 'content',
    label: 'Content',
    items: [
      { label: 'Landing Page', href: '/super-admin/landing', icon: Globe },
    ],
  },
  {
    key: 'system',
    label: 'System Control',
    items: [
      { label: 'Settings', href: '/super-admin/settings', icon: Settings },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch { /* ignore */ }
  }, [key]);

  const set = useCallback((v: T) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  }, [key]);

  return [value, set];
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useLocalStorage<Record<string, boolean>>(
    'sa-nav-groups',
    { overview: true, management: true, content: true, system: true }
  );

  const toggleGroup = (key: string) =>
    setOpenGroups({ ...openGroups, [key]: !openGroups[key] });

  // Determine active href — exact for root, prefix for others
  const isActive = (href: string) =>
    href === '/super-admin'
      ? pathname === '/super-admin'
      : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      id="sa-sidebar"
      className="relative flex flex-col h-full overflow-hidden transition-[width,min-width] duration-300 ease-in-out sa-scrollbar"
      style={{
        width: collapsed ? 'var(--sa-sidebar-collapsed-w)' : 'var(--sa-sidebar-w)',
        minWidth: collapsed ? 'var(--sa-sidebar-collapsed-w)' : 'var(--sa-sidebar-w)',
        background: 'var(--sa-surface)',
        borderRight: '1px solid var(--sa-border)',
      }}
    >
        {/* Logo bar */}
        <div
          className="flex items-center h-[60px] px-4 shrink-0"
          style={{ borderBottom: '1px solid var(--sa-border)' }}
        >
          <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--sa-accent)', boxShadow: '0 0 12px rgba(99,102,241,0.35)' }}
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--sa-text)' }}>
                  NEPMS
                </p>
                <p className="text-[10px] leading-tight font-medium truncate" style={{ color: 'var(--sa-accent)' }}>
                  Super Admin
                </p>
              </div>
            )}
          </div>
          {/* Collapse toggle */}
          <button
            onClick={onToggle}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
            style={{
              color: 'var(--sa-text-muted)',
              background: 'transparent',
              border: '1px solid var(--sa-border)',
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 sa-scrollbar">
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroups[group.key] !== false;
            const hasActive = group.items.some((i) => isActive(i.href));

            return (
              <div key={group.key} className="mb-1">
                {/* Group header */}
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors"
                    style={{ color: hasActive ? 'var(--sa-accent)' : 'var(--sa-text-faint)' }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest">
                      {group.label}
                    </span>
                    <ChevronDown
                      className="w-3 h-3 transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    />
                  </button>
                )}

                {/* Items */}
                {(isOpen || collapsed) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 group"
                          style={{
                            color: active ? 'var(--sa-accent)' : 'var(--sa-text-muted)',
                            background: active ? 'var(--sa-accent-muted)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-hover)';
                              (e.currentTarget as HTMLElement).style.color = 'var(--sa-text)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              (e.currentTarget as HTMLElement).style.background = 'transparent';
                              (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-muted)';
                            }
                          }}
                        >
                          <Icon
                            className={`shrink-0 ${collapsed ? 'w-5 h-5 mx-auto' : 'w-4 h-4'}`}
                          />
                          {!collapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                          {!collapsed && active && (
                            <span
                              className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: 'var(--sa-accent)' }}
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom user strip */}
        {!collapsed && (
          <div
            className="p-3 shrink-0"
            style={{ borderTop: '1px solid var(--sa-border)' }}
          >
            <SAUserStrip />
          </div>
        )}
      </aside>
  );
}


// ── SA User strip (bottom of sidebar) ─────────────────────────────────────────

function SAUserStrip() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => { logout(); router.push('/login'); };

  const initials = (user?.username ?? 'SA').slice(0, 2).toUpperCase();

  return (
    <div
      className="flex items-center gap-2.5 p-2 rounded-xl"
      style={{ background: 'var(--sa-surface-raised)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ background: 'var(--sa-accent)' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--sa-text)' }}>
          {user?.username ?? 'Super Admin'}
        </p>
        <p className="text-[10px] truncate leading-tight" style={{ color: 'var(--sa-text-muted)' }}>
          Platform Administrator
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: 'var(--sa-text-faint)' }}
        title="Logout"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--sa-danger)';
          (e.currentTarget as HTMLElement).style.background = 'var(--sa-danger-muted)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-faint)';
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Top Bar ────────────────────────────────────────────────────────────────────

function TopBar({
  onSidebarToggle,
  sidebarCollapsed,
}: {
  onSidebarToggle: () => void;
  sidebarCollapsed: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Derive page title from pathname
  const pageTitle = (() => {
    const seg = pathname.split('/').filter(Boolean);
    const last = seg[seg.length - 1];
    if (!last || last === 'super-admin') return 'Dashboard';
    return last
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  })();

  const handleLogout = () => { setProfileOpen(false); logout(); router.push('/login'); };
  const initials = (user?.username ?? 'SA').slice(0, 2).toUpperCase();
  const isDark = theme === 'dark';

  return (
    <header
      className="flex items-center justify-between px-5 shrink-0 z-10"
      style={{
        height: 'var(--sa-topbar-h)',
        background: 'var(--sa-surface)',
        borderBottom: '1px solid var(--sa-border)',
      }}
    >
      {/* Left: mobile menu + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSidebarToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors md:hidden"
          style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)' }}
        >
          <Menu className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-semibold leading-tight" style={{ color: 'var(--sa-text)' }}>
            {pageTitle}
          </h1>
          <p className="text-[10px] hidden sm:block" style={{ color: 'var(--sa-text-faint)' }}>
            NEPMS Platform Control
          </p>
        </div>
      </div>

      {/* Right: theme toggle + profile */}
      <div className="flex items-center gap-2">

        {/* Sparkles badge */}
        <span
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{
            background: 'var(--sa-accent-muted)',
            color: 'var(--sa-accent)',
            border: '1px solid var(--sa-accent-muted)',
          }}
        >
          <Sparkles className="w-2.5 h-2.5" />
          Super Admin
        </span>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ color: 'var(--sa-text-muted)', background: 'var(--sa-surface-raised)', border: '1px solid var(--sa-border)' }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--sa-text)';
            (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-muted)';
            (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-raised)';
          }}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            id="sa-profile-btn"
            onClick={() => setProfileOpen((p) => !p)}
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl transition-all"
            style={{
              background: profileOpen ? 'var(--sa-surface-raised)' : 'transparent',
              border: `1px solid ${profileOpen ? 'var(--sa-border-strong)' : 'transparent'}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-raised)';
            }}
            onMouseLeave={(e) => {
              if (!profileOpen) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: 'var(--sa-accent)' }}
            >
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium" style={{ color: 'var(--sa-text)' }}>
              {user?.username ?? 'Admin'}
            </span>
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform duration-200 hidden sm:block"
              style={{
                color: 'var(--sa-text-muted)',
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-60 rounded-2xl shadow-2xl overflow-hidden z-50 sa-dropdown"
              style={{
                background: 'var(--sa-surface)',
                border: '1px solid var(--sa-border-strong)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              {/* User info header */}
              <div className="p-4" style={{ borderBottom: '1px solid var(--sa-border)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: 'var(--sa-accent)' }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--sa-text)' }}>
                      {user?.username ?? 'Super Admin'}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--sa-text-muted)' }}>
                      {user?.email ?? 'Platform Administrator'}
                    </p>
                    <span
                      className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{ background: 'var(--sa-accent-muted)', color: 'var(--sa-accent)' }}
                    >
                      <Shield className="w-2.5 h-2.5" />
                      Super Admin
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
                  style={{ color: 'var(--sa-text-muted)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--sa-surface-raised)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--sa-text)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--sa-text-muted)';
                  }}
                  onClick={() => { setProfileOpen(false); router.push('/super-admin/settings'); }}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                <div className="my-1.5" style={{ height: '1px', background: 'var(--sa-border)' }} />

                <button
                  id="sa-logout-btn"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
                  style={{ color: 'var(--sa-danger)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--sa-danger-muted)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ── SuperAdminShell ────────────────────────────────────────────────────────────

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sa-sidebar-collapsed', false);
  const { theme } = useTheme();
  const pathname = usePathname();

  // Apply sa-light class when in light mode so CSS vars flip
  const themeClass = theme === 'dark' ? '' : 'sa-light';

  return (
    <div
      id="sa-shell"
      className={`flex h-screen overflow-hidden ${themeClass}`}
      style={{ background: 'var(--sa-bg)' }}
    >
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto sa-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
