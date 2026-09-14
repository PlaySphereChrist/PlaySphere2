import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isOrganizerOrAdmin = user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN');
  const isAdmin = user?.roles?.includes('ADMIN');

  const navItemClass = (isActive, startsWith = '') =>
    `inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
      isActive || (startsWith && location.pathname.startsWith(startsWith))
        ? 'border-indigo-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;

  const mobileNavItemClass = (isActive, startsWith = '') =>
    `block px-3 py-2 rounded-md text-base font-medium ${
      isActive || (startsWith && location.pathname.startsWith(startsWith))
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-gray-700 hover:bg-gray-50'
    }`;

  const navLinks = [
    { to: '/tournaments', label: 'Tournaments', startsWith: '/tournaments' },
    { to: '/my-registrations', label: 'My Registrations' },
    { to: '/community', label: 'Community', startsWith: '/community' },
    { to: '/sports', label: 'Sports' },
    { to: '/casual-games', label: 'Casual Games', startsWith: '/casual-games' },
    { to: '/teams', label: 'Teams', startsWith: '/teams' },
    { to: '/grounds', label: 'Grounds', startsWith: '/grounds', exactCheck: (path) => path.startsWith('/grounds') && !path.startsWith('/admin') },
    { to: '/bookings', label: 'My Bookings', startsWith: '/bookings' },
    { to: '/player-profile', label: 'Player Profile' },
    { to: '/profile', label: 'Account' },
  ];

  if (isOrganizerOrAdmin) {
    navLinks.push({ to: '/organizer/tournaments', label: 'Manage Tournaments', startsWith: '/organizer/tournaments' });
  }

  if (isAdmin) {
    navLinks.push({ to: '/admin/grounds', label: 'Admin Grounds', startsWith: '/admin/grounds' });
    navLinks.push({ to: '/admin/reports', label: 'Report Queue', startsWith: '/admin/reports' });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">

            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-indigo-600">PlaySphere</span>
              </div>

              {/* Desktop Menu */}
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8 overflow-x-auto">
                {navLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => navItemClass(isActive, link.startsWith)}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-expanded="false"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 pt-2 pb-3">
            <div className="space-y-1 px-2">
              {navLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => mobileNavItemClass(isActive, link.startsWith)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-4 pt-4 px-4 pb-2">
              <div className="text-sm font-medium text-gray-500 mb-3">{user?.email}</div>
              <button
                onClick={handleLogout}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
