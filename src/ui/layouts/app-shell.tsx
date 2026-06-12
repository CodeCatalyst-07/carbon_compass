import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router';
import {
  BarChart3,
  Compass,
  Lightbulb,
  ArrowLeftRight,
  TrendingUp,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { SkipLink } from '../components/skip-link';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <BarChart3 size={18} aria-hidden="true" /> },
  { to: '/actions', label: 'Actions', icon: <Lightbulb size={18} aria-hidden="true" /> },
  { to: '/simulator', label: 'Simulator', icon: <ArrowLeftRight size={18} aria-hidden="true" /> },
  { to: '/progress', label: 'Progress', icon: <TrendingUp size={18} aria-hidden="true" /> },
  { to: '/methodology', label: 'About', icon: <BookOpen size={18} aria-hidden="true" /> },
];

function NavLinkItem({ to, label, icon, onClick }: NavItem & { onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-sm px-lg py-md rounded-xl',
          'text-sm font-semibold transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          isActive
            ? 'bg-primary-pale text-ink-deep'
            : 'text-body hover:bg-canvas-soft hover:text-ink',
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/**
 * App shell layout — sticky header with nav, main content, footer.
 * - Desktop: horizontal nav links in header
 * - Mobile: hamburger menu with slide-out side panel
 * - Semantic landmarks: header, nav, main, footer
 * - Focus management for mobile menu
 */
export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Focus management for mobile menu
  useEffect(() => {
    if (mobileMenuOpen) {
      // Focus first link in the menu
      const firstLink = menuPanelRef.current?.querySelector('a');
      firstLink?.focus();
    }
  }, [mobileMenuOpen]);

  // Escape key closes mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileMenuOpen]);

  // Focus trap inside mobile menu
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !menuPanelRef.current) return;
    const focusable = menuPanelRef.current.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-canvas-soft">
      <SkipLink />

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 bg-canvas border-b border-canvas-soft">
        <div className="max-w-[1200px] mx-auto px-xl py-md flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-lg"
          >
            <Compass size={24} className="text-primary" aria-hidden="true" />
            <span className="font-display text-lg font-black text-ink">Carbon Compass</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-xs" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <NavLinkItem key={item.to} {...item} />
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            ref={menuButtonRef}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              'md:hidden flex items-center justify-center w-10 h-10 rounded-xl',
              'text-ink hover:bg-canvas-soft',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              'transition-colors duration-150',
            )}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* ─── Mobile nav overlay ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            ref={menuPanelRef}
            id="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onKeyDown={handleMenuKeyDown}
            className={cn(
              'absolute top-0 right-0 h-full w-64 bg-canvas shadow-lg',
              'flex flex-col p-xl gap-sm',
            )}
          >
            <div className="flex justify-end mb-md">
              <button
                onClick={closeMobileMenu}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  'text-ink hover:bg-canvas-soft',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                )}
                aria-label="Close menu"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Main navigation">
              <ul className="flex flex-col gap-xs list-none p-0 m-0">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <NavLinkItem {...item} onClick={closeMobileMenu} />
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* ─── Main content ─── */}
      <main id="main-content" className="flex-1">
        <div className="max-w-[1200px] mx-auto px-xl py-2xl">
          <Outlet />
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-ink text-canvas-soft">
        <div className="max-w-[1200px] mx-auto px-xl py-3xl">
          <div className="flex flex-col md:flex-row justify-between gap-xl">
            <div className="flex flex-col gap-sm">
              <div className="flex items-center gap-sm">
                <Compass size={18} className="text-primary" aria-hidden="true" />
                <span className="text-sm font-semibold text-canvas">Carbon Compass</span>
              </div>
              <p className="text-xs text-canvas-soft/80 max-w-sm">
                A privacy-first carbon footprint coach. All data stays on your device. These are
                estimates, not audited measurements.
              </p>
            </div>
            <div className="flex flex-col gap-sm text-xs">
              <NavLink
                to="/methodology"
                className="text-canvas-soft/80 hover:text-canvas transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                Methodology & Sources
              </NavLink>
              <NavLink
                to="/methodology"
                className="text-canvas-soft/80 hover:text-canvas transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                Privacy & Data
              </NavLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
