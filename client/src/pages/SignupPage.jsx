import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/AuthContext';
import { PsButton, PsCard, PsInput, PsAlert } from '../components/ui';

function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="27" className="stroke-gold" strokeWidth="1.1" opacity="0.7" />
      <ellipse cx="30" cy="30" rx="27" ry="10" className="stroke-maroon" strokeWidth="1.3" />
      <ellipse cx="30" cy="30" rx="10" ry="27" className="stroke-maroon" strokeWidth="1.3" transform="rotate(28 30 30)" />
      <circle cx="30" cy="30" r="3.2" className="fill-maroon" />
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
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-background">
      <svg className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-[0.08] pointer-events-none" width="640" height="640" viewBox="0 0 640 640">
        <circle cx="320" cy="320" r="300" className="stroke-maroon" strokeWidth="1" fill="none" />
        <ellipse cx="320" cy="320" rx="300" ry="120" className="stroke-gold" strokeWidth="1" fill="none" />
        <ellipse cx="320" cy="320" rx="120" ry="300" className="stroke-gold" strokeWidth="1" fill="none" transform="rotate(30 320 320)" />
      </svg>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <LogoMark size={26} />
            <span className="font-serif text-lg font-bold text-primary">
              PlaySphere
            </span>
          </Link>
        </div>

        <PsCard className="p-8">
          <h2 className="text-center text-3xl font-serif font-bold text-primary">
            Create a PlaySphere Account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary">
            Join to book grounds, enter tournaments, and find your team.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {error && <PsAlert variant="error">{error}</PsAlert>}

            <div className="space-y-3">
              <PsInput
                label="Email address"
                id="email-address"
                name="email"
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PsInput
                label="Password"
                id="password"
                name="password"
                type="password"
                required
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PsInput
                label="Confirm Password"
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <PsButton type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing up...' : 'Sign up'}
              </PsButton>
            </div>

            <div className="text-sm text-center pt-2">
              <span className="text-secondary">Already have an account? </span>
              <Link to="/login" className="font-medium text-maroon hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </PsCard>
      </div>
    </div>
  );
}