import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import PlayerProfilePage from './pages/PlayerProfilePage';

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
        </Route>
      </Route>
    </Routes>
  );
}
