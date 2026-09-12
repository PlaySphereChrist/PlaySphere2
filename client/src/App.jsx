import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
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

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null; // handled by ProtectedRoute / AuthContext if needed globally, but let's keep it simple here.

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/profile" replace /> : <LoginPage />} 
      />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/player-profile" element={<PlayerProfilePage />} />
          <Route path="/sports" element={<SportsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:teamId" element={<TeamDetailsPage />} />
          <Route path="/grounds" element={<GroundsPage />} />
          <Route path="/grounds/:groundId" element={<GroundDetailsPage />} />
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/bookings/:bookingId" element={<BookingDetailsPage />} />
          <Route path="/admin/grounds" element={<AdminGroundsPage />} />
          <Route path="/admin/grounds/:groundId" element={<AdminGroundDetailsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
