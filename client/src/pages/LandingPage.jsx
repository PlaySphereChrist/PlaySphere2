import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  Trophy, Users, MapPin, Swords, Moon, Sun, ChevronDown
} from 'lucide-react';
// lucide-react v1 removed brand/logo icons (trademark reasons), so social
// icons come from react-icons instead.
import { FaInstagram, FaFacebook, FaXTwitter, FaYoutube, FaLinkedin } from 'react-icons/fa6';

const NAV_ITEMS = [
  { label: 'Tournaments', path: '/tournaments' },
  { label: 'Community', path: '/community' },
  { label: 'Sports', path: '/sports' },
  { label: 'Casual Games', path: '/casual-games' },
  { label: 'Teams', path: '/teams' },
  { label: 'Grounds', path: '/grounds' },
  { label: 'My Bookings', path: '/my-bookings' },
];

const GROUNDS = [
  'Green Valley Turf', 'Riverside Sports Complex', 'City Arena',
  'Sunset Ground', 'Elite Sports Park', 'Harbourline Courts', 'Oakfield Stadium',
];

const FAQS = [
  {
    q: 'How do I book a ground?',
    a: 'Open the Grounds tab, pick a venue and a free slot, and confirm payment. Your booking shows up under My Bookings right away.',
  },
  {
    q: 'Can I join a tournament without a team?',
    a: 'Yes. Many tournaments accept solo sign-ups and place you with a team, or you can join an existing team looking for players.',
  },
  {
    q: 'Is PlaySphere free to use?',
    a: 'Browsing, registrations, and community features are free. You only pay when you book a ground or enter a paid tournament.',
  },
];

const SOCIALS = [
  { icon: FaInstagram, label: 'Instagram', href: '/', hover: '#C1387A' },
  { icon: FaFacebook, label: 'Facebook', href: '/', hover: '#3B5FA0' },
  { icon: FaXTwitter, label: 'Twitter', href: '/', hover: '#3AA0E8' },
  { icon: FaYoutube, label: 'YouTube', href: '/', hover: '#D33A3A' },
  { icon: FaLinkedin, label: 'LinkedIn', href: '/', hover: '#3577B5' },
];

/* ------------------------------------------------------------------ */
/*  Logo mark — armillary-sphere motif echoing the PlaySphere wordmark  */
/* ------------------------------------------------------------------ */
function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="27" stroke="var(--accent-gold)" strokeWidth="1.1" opacity="0.7" />
      <ellipse cx="30" cy="30" rx="27" ry="10" stroke="var(--accent-maroon)" strokeWidth="1.3" />
      <ellipse cx="30" cy="30" rx="10" ry="27" stroke="var(--accent-maroon)" strokeWidth="1.3" transform="rotate(28 30 30)" />
      <circle cx="30" cy="30" r="3.2" fill="var(--accent-maroon)" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar — real routing: signed-in users go straight to the section, */
/*  signed-out users are sent to /login with a message + return path.  */
/* ------------------------------------------------------------------ */
function Navbar({ darkMode, setDarkMode, user, onProtectedNav }) {
  return (
    <header
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      className="sticky top-0 z-40"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex items-center gap-6 h-16">

          <button
  type="button"
  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
  className="inline-block"
>
  <h3 style={{ fontFamily: "'Fraunces', serif", color: 'var(--text-primary)' }} className="text-2xl sm:text-3xl font-semibold tracking-tight">
    PlaySphere
  </h3>
</button>

          {/* Running ground ticker — sits right after the wordmark */}
          <div
            className="hidden md:block relative overflow-hidden flex-1 max-w-xs h-6"
            style={{
              maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
              WebkitMaskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
            }}
            aria-label="Grounds available now"
          >
            <div className="ps-marquee whitespace-nowrap text-xs tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              {[...GROUNDS, ...GROUNDS].map((g, i) => (
                <span key={i} className="mx-4 inline-flex items-center gap-1.5">
                  <MapPin size={15} style={{ color: 'var(--accent-gold)' }} />
                  {g}
                </span>
              ))}
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 ml-auto overflow-x-auto">
            {NAV_ITEMS.map(({ label, path }) => (
              <button
                key={label}
                onClick={() => onProtectedNav(path, label)}
                style={{ color: 'var(--text-secondary)' }}
                className="px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-150"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pill-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setDarkMode((d) => !d)}
            aria-label="Toggle dark mode"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            className="ml-2 shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:brightness-110 transition"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {!user ? (
            <Link
              to="/login"
              style={{ background: 'var(--accent-maroon)' }}
              className="hidden sm:inline-flex ml-2 shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110"
            >
              Log in
            </Link>
          ) : null}
        </div>

        <div className="lg:hidden flex gap-1 pb-3 overflow-x-auto">
          {NAV_ITEMS.map(({ label, path }) => (
            <button
              key={label}
              onClick={() => onProtectedNav(path, label)}
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ accordion                                                       */
/* ------------------------------------------------------------------ */
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h2
        style={{ fontFamily: "'Fraunces', serif", color: 'var(--text-primary)' }}
        className="text-3xl font-semibold mb-8 text-center"
      >
        Questions, answered
      </h2>
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {FAQS.map((item, i) => {
          const expanded = open === i;
          return (
            <div key={item.q} style={{ borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => setOpen(expanded ? -1 : i)}
                className="w-full flex items-center justify-between py-5 text-left"
              >
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">{item.q}</span>
                <ChevronDown
                  size={18}
                  style={{ color: 'var(--accent-gold)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
              </button>
              <div style={{ maxHeight: expanded ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
                <p style={{ color: 'var(--text-secondary)' }} className="pb-5 text-sm leading-6">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                              */
/* ------------------------------------------------------------------ */
function Footer() {
  const [hovered, setHovered] = useState(null);
  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span style={{ fontFamily: "'Fraunces', serif", color: 'var(--text-primary)' }} className="font-semibold">
            PlaySphere
          </span>
          <span style={{ color: 'var(--text-secondary)' }} className="text-xs ml-2">Discover. Play. Compete.</span>
        </div>

        <div className="flex items-center gap-3">
          {SOCIALS.map(({ icon: Icon, label, hover }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
              style={{
                border: '1px solid var(--border)',
                color: hovered === label ? '#fff' : 'var(--text-secondary)',
                background: hovered === label ? hover : 'transparent',
                transform: hovered === label ? 'translateY(-2px)' : 'none',
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150"
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        <p style={{ color: 'var(--text-secondary)' }} className="text-xs">
          © {new Date().getFullYear()} PlaySphere. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Features (unchanged content, only lucide icons swapped for names)  */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { name: 'Tournaments', description: 'Find and register for local tournaments. Track schedules, waitlists, and eligibility rules easily.', icon: Trophy },
  { name: 'Casual Games', description: 'Looking for a quick match? Find local pickup games, join open spots, and meet new players.', icon: Swords },
  { name: 'Ground Booking', description: 'Book premium sports venues instantly. Check availability, pay securely, and manage your reservations.', icon: MapPin },
  { name: 'Team Management', description: 'Build your roster, manage players, and register your whole team for leagues with a single click.', icon: Users },
];

/* ------------------------------------------------------------------ */
/*  Root                                                                */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  // Any protected nav item: signed-in users go straight there, signed-out
  // users are sent to /login with a message and the page they were after.
  function onProtectedNav(path, label) {
    if (user) {
      navigate(path);
    } else {
      navigate('/login', { state: { message: `Please log in to access ${label}`, from: path } });
    }
  }

  return (
    <div className={darkMode ? 'dark' : ''} style={{ minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        :root {
          --bg: #FAF7F2;
          --surface: #FFFFFF;
          --text-primary: #241412;
          --text-secondary: #6B5B54;
          --border: #E4DDD3;
          --accent-maroon: #6E1423;
          --accent-gold: #A87C3F;
          --pill-hover: #F1E9DE;
        }
        .dark {
          --bg: #15100D;
          --surface: #1D1613;
          --text-primary: #F3EDE6;
          --text-secondary: #B8AA9E;
          --border: #3A2E27;
          --accent-maroon: #D8546A;
          --accent-gold: #C79A54;
          --pill-hover: #2A211C;
        }
        .ps-landing, .ps-landing * { font-family: 'Inter', sans-serif; }

        @keyframes ps-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ps-marquee { animation: ps-marquee 18s linear infinite; }
      `}</style>

      <div className="ps-landing" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} user={user} onProtectedNav={onProtectedNav} />

        <div className="relative isolate px-6 pt-14 lg:px-8 overflow-hidden">
          <svg className="absolute -top-24 left-1/2 -translate-x-1/2 -z-10 opacity-[0.15]" width="760" height="760" viewBox="0 0 760 760">
            <circle cx="380" cy="380" r="360" stroke="var(--accent-maroon)" strokeWidth="1" fill="none" />
            <ellipse cx="380" cy="380" rx="360" ry="140" stroke="var(--accent-gold)" strokeWidth="1" fill="none" />
            <ellipse cx="380" cy="380" rx="140" ry="360" stroke="var(--accent-gold)" strokeWidth="1" fill="none" transform="rotate(30 380 380)" />
          </svg>

          <div className="mx-auto max-w-2xl py-28 sm:py-40 text-center">
           <Link to="/">
  <h3 style={{ fontFamily: "'Fraunces', serif", color: 'var(--text-primary)' }} className="text-4xl sm:text-6xl font-semibold tracking-tight">
    PlaySphere
  </h3>
</Link>
            <p style={{ color: 'var(--text-secondary)' }} className="mt-6 text-lg leading-8">
              The complete ecosystem for amateur sports. Manage teams, book grounds,
              join casual games, and compete in tournaments — all in one place.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {user ? (
                <Link
                  to="/tournaments"
                  style={{ background: 'var(--accent-maroon)' }}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
                >
                  Go to App
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup"
                    style={{ background: 'var(--accent-maroon)' }}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
                  >
                    Create Account
                  </Link>
                  <Link to="/login" style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold">
                    Log in <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-28">
            <div className="mx-auto max-w-2xl text-center">
              <h2 style={{ color: 'var(--accent-maroon)' }} className="text-sm font-semibold">Everything you need</h2>
              <p style={{ fontFamily: "'Fraunces', serif", color: 'var(--text-primary)' }} className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Unleash your potential
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-2.5 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <feature.icon size={18} style={{ color: 'var(--accent-gold)' }} />
                    {feature.name}
                  </dt>
                  <dd className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    {feature.description}
                  </dd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Faq />
        <Footer />
      </div>
    </div>
  );
}