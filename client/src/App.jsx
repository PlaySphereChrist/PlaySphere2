import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import SportsPage from './pages/SportsPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailsPage from './pages/TeamDetailsPage';
import GroundsPage from './pages/GroundsPage';
import GroundDetailsPage from './pages/GroundDetailsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import BookingDetailsPage from './pages/BookingDetailsPage';
import AdminGroundsPage from './pages/admin/AdminGroundsPage';
import AdminGroundDetailsPage from './pages/admin/AdminGroundDetailsPage';
import CasualGamesPage from './pages/CasualGamesPage';
import CasualGameDetailsPage from './pages/CasualGameDetailsPage';
import CasualGameForm from './pages/CasualGameForm';

import TournamentsPage from './pages/tournaments/TournamentsPage';
import TournamentDetailsPage from './pages/tournaments/TournamentDetailsPage';
import MyRegistrationsPage from './pages/tournaments/MyRegistrationsPage';
import OrganizerTournamentsPage from './pages/tournaments/organizer/OrganizerTournamentsPage';
import TournamentFormPage from './pages/tournaments/organizer/TournamentFormPage';
import TournamentManagePage from './pages/tournaments/organizer/TournamentManagePage';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/tournaments" replace /> : <LoginPage />}
      />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/player-profile" element={<PlayerProfilePage />} />
          <Route path="/sports" element={<SportsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:teamId" element={<TeamDetailsPage />} />
          <Route path="/grounds" element={<GroundsPage />} />
          <Route path="/grounds/:groundId" element={<GroundDetailsPage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/bookings/:bookingId" element={<BookingDetailsPage />} />
          <Route path="/casual-games" element={<CasualGamesPage />} />
          <Route path="/casual-games/create" element={<CasualGameForm />} />
          <Route path="/casual-games/:gameId" element={<CasualGameDetailsPage />} />
          <Route path="/casual-games/:gameId/edit" element={<CasualGameForm />} />
          <Route path="/admin/grounds" element={<AdminGroundsPage />} />
          <Route path="/admin/grounds/:groundId" element={<AdminGroundDetailsPage />} />

          {/* Tournament Routes */}
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:tournamentId" element={<TournamentDetailsPage />} />
          <Route path="/my-registrations" element={<MyRegistrationsPage />} />

          <Route path="/organizer/tournaments" element={
            user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN') ? <OrganizerTournamentsPage /> : <Navigate to="/tournaments" replace />
          } />
          <Route path="/organizer/tournaments/new" element={
            user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN') ? <TournamentFormPage /> : <Navigate to="/tournaments" replace />
          } />
          <Route path="/organizer/tournaments/:tournamentId/edit" element={
            user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN') ? <TournamentFormPage /> : <Navigate to="/tournaments" replace />
          } />
          <Route path="/organizer/tournaments/:tournamentId/manage" element={
            user?.roles?.includes('ORGANIZER') || user?.roles?.includes('ADMIN') ? <TournamentManagePage /> : <Navigate to="/tournaments" replace />
          } />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
