import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../store/AuthContext';

/* Armillary-sphere logo mark, matching the landing page wordmark */
function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="27" stroke="#A67C52" strokeWidth="1.1" opacity="0.7" />
      <ellipse cx="30" cy="30" rx="27" ry="10" stroke="#6F4E37" strokeWidth="1.3" />
      <ellipse cx="30" cy="30" rx="10" ry="27" stroke="#6F4E37" strokeWidth="1.3" transform="rotate(28 30 30)" />
      <circle cx="30" cy="30" r="3.2" fill="#6F4E37" />
    </svg>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, login } = useAuth();

  // If already logged in, redirect away from public signup
  if (user) {
    return <Navigate to="/tournaments" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', { email, password });
      if (res.success) {
        // Auto-login after successful registration
        await login(email, password);
        navigate('/player-profile', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ps-auth flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: '#F5EFE6' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .ps-auth, .ps-auth * { font-family: 'Inter', sans-serif; }
        .ps-auth input:focus { outline: none; box-shadow: 0 0 0 2px #6F4E37; border-color: #6F4E37; }
      `}</style>

      {/* orbit-ring watermark, echoing the landing hero */}
      <svg className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-[0.08] pointer-events-none" width="640" height="640" viewBox="0 0 640 640">
        <circle cx="320" cy="320" r="300" stroke="#6F4E37" strokeWidth="1" fill="none" />
        <ellipse cx="320" cy="320" rx="300" ry="120" stroke="#A67C52" strokeWidth="1" fill="none" />
        <ellipse cx="320" cy="320" rx="120" ry="300" stroke="#A67C52" strokeWidth="1" fill="none" transform="rotate(30 320 320)" />
      </svg>

      <div className="w-full max-w-md space-y-6 relative">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <LogoMark size={26} />
            <span style={{ fontFamily: "'Fraunces', serif", color: '#6F4E37' }} className="text-lg font-bold">
              PlaySphere
            </span>
          </Link>
        </div>

        <div
          style={{ background: '#FFFFFF', border: '1px solid #E0D2C0' }}
          className="rounded-2xl p-8 shadow-sm"
        >
          <h2
            style={{ fontFamily: "'Fraunces', serif", color: '#2E1D14' }}
            className="text-center text-3xl font-semibold tracking-tight"
          >
            Create a PlaySphere Account
          </h2>
          <p style={{ color: '#7A6552' }} className="mt-2 text-center text-sm">
            Join to book grounds, enter tournaments, and find your team.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <ErrorMessage message={error} />

            <div className="space-y-3">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  style={{ border: '1px solid #E0D2C0', color: '#2E1D14' }}
                  className="block w-full rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-400 transition"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  style={{ border: '1px solid #E0D2C0', color: '#2E1D14' }}
                  className="block w-full rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-400 transition"
                  placeholder="Password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  style={{ border: '1px solid #E0D2C0', color: '#2E1D14' }}
                  className="block w-full rounded-lg px-3.5 py-2.5 text-sm placeholder:text-gray-400 transition"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: '#6F4E37' }}
              className="flex w-full justify-center items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <Spinner size="sm" className="text-white" /> : 'Sign up'}
            </button>

            <div className="text-sm text-center pt-1">
              <span style={{ color: '#7A6552' }}>Already have an account? </span>
              <Link to="/login" style={{ color: '#6F4E37' }} className="font-medium hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}