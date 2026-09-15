import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import NotificationsDropdown from './NotificationsDropdown';
import {
  Sun, Moon, Menu, X, ChevronDown, LogOut, User,
  Trophy, Users, MapPin, Zap, Calendar, Shield
} from 'lucide-react';

/* ── Shared logo mark ─────────────────────────────────────── */
function LogoMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="17" stroke="var(--accent-maroon)" strokeWidth="1.5"/>
      <ellipse cx="18" cy="18" rx="17" ry="7" stroke="var(--accent-gold)" strokeWidth="1"/>
      <ellipse cx="18" cy="18" rx="7" ry="17" stroke="var(--accent-gold)" strokeWidth="1"/>
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isOrganizer = user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN');
  const isAdmin = user?.roles?.includes('ADMIN');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path, startsWith = '') =>
    location.pathname === path || (startsWith && location.pathname.startsWith(startsWith));

  const navLinks = [
    { to: '/tournaments', label: 'Tournaments', icon: Trophy, startsWith: '/tournaments' },
    { to: '/teams',       label: 'Teams',       icon: Users,  startsWith: '/teams' },
    { to: '/grounds',     label: 'Grounds',     icon: MapPin, startsWith: '/grounds' },
    { to: '/casual-games',label: 'Casual Games',icon: Zap,    startsWith: '/casual-games' },
    { to: '/community',   label: 'Community',   icon: Calendar,startsWith: '/community' },
  ];

  if (isOrganizer) {
    navLinks.push({ to: '/organizer/tournaments', label: 'Organizer', icon: Shield, startsWith: '/organizer' });
  }

  const pillBase = 'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-150';
  const activePill = `${pillBase} bg-maroon text-white`;
  const inactivePill = `${pillBase} text-secondary hover:bg-pill-hover`;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ───────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b border-border"
        style={{ background: 'var(--surface)' }}
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 shrink-0"
            >
              <LogoMark size={26} />
              <span className="font-serif font-semibold text-xl text-primary tracking-tight">
                PlaySphere
              </span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {navLinks.map(({ to, label, startsWith }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={isActive(to, startsWith) ? activePill : inactivePill}
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={toggle}
                aria-label="Toggle dark mode"
                className="w-9 h-9 rounded-full flex items-center justify-center border border-border text-primary hover:brightness-110 transition"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Notifications */}
              <NotificationsDropdown />

              {/* User menu (desktop) */}
              <div className="hidden sm:block relative">
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-sm text-primary hover:bg-pill-hover transition"
                >
                  <User size={14} />
                  <span className="max-w-[120px] truncate">{user?.email?.split('@')[0]}</span>
                  <ChevronDown size={12} />
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-xl shadow-lg border border-border overflow-hidden z-50"
                    style={{ background: 'var(--surface)' }}
                    onBlur={() => setUserMenuOpen(false)}
                  >
                    <Link
                      to="/player-profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-pill-hover transition"
                    >
                      <User size={14} /> Player Profile
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-pill-hover transition"
                    >
                      <Shield size={14} /> Account
                    </Link>
                    <Link
                      to="/my-registrations"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-pill-hover transition"
                    >
                      <Trophy size={14} /> My Registrations
                    </Link>
                    <Link
                      to="/bookings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-pill-hover transition"
                    >
                      <Calendar size={14} /> My Bookings
                    </Link>
                    {isAdmin && (
                      <>
                        <div className="border-t border-border" />
                        <Link
                          to="/admin/grounds"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-pill-hover transition"
                        >
                          <MapPin size={14} /> Admin Grounds
                        </Link>
                        <Link
                          to="/admin/reports"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-pill-hover transition"
                        >
                          <Shield size={14} /> Report Queue
                        </Link>
                      </>
                    )}
                    <div className="border-t border-border" />
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-error hover:bg-pill-hover transition"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile burger */}
              <button
                className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center border border-border text-primary"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Open menu"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-border" style={{ background: 'var(--surface)' }}>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {navLinks.map(({ to, label, startsWith }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={isActive(to, startsWith) ? activePill : inactivePill}
                >
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="border-t border-border px-4 py-3 flex flex-col gap-1">
              <div className="text-xs text-secondary mb-1">{user?.email}</div>
              <Link to="/player-profile" onClick={() => setMobileOpen(false)} className="text-sm text-primary py-1">Player Profile</Link>
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="text-sm text-primary py-1">Account</Link>
              <Link to="/my-registrations" onClick={() => setMobileOpen(false)} className="text-sm text-primary py-1">My Registrations</Link>
              <Link to="/bookings" onClick={() => setMobileOpen(false)} className="text-sm text-primary py-1">My Bookings</Link>
              {isAdmin && (
                <>
                  <Link to="/admin/grounds" onClick={() => setMobileOpen(false)} className="text-sm text-primary py-1">Admin Grounds</Link>
                  <Link to="/admin/reports" onClick={() => setMobileOpen(false)} className="text-sm text-primary py-1">Report Queue</Link>
                </>
              )}
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="text-left text-sm text-error py-1"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
