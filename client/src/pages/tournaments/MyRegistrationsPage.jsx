import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../../components/ui';

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/registrations');
      setRegistrations(res.data.registrations || []);
    } catch (err) {
      setError(err.message || 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const handleCancel = async (tournamentId, registrationId) => {
    if (!window.confirm('Are you sure you want to cancel this registration?')) return;
    try {
      await api.delete(`/tournaments/${tournamentId}/registrations/${registrationId}`);
      await loadRegistrations(); // refresh
    } catch (err) {
      window.alert(err.message || 'Cancellation failed');
    }
  };

  if (loading) return <PsLoading />;
  
  return (
    <div className="space-y-6">
      <PsPageHeader title="My Registrations" />
      
      {error && <PsAlert variant="error">{error}</PsAlert>}
      
      {registrations.length === 0 && !error ? (
        <PsEmpty 
          title="No registrations found" 
          message="You haven't registered for any tournaments yet." 
          action={
            <Link to="/tournaments">
              <PsButton>Browse Tournaments</PsButton>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => (
            <PsCard key={reg.registration_id} className="hover:border-maroon/50 transition">
              <div className="px-6 py-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-serif font-bold text-primary truncate">
                    <Link to={`/tournaments/${reg.tournament_id}`} className="hover:text-maroon transition">
                      {reg.tournament_name}
                    </Link>
                  </h3>
                  <div className="ml-2 flex flex-shrink-0">
                    <PsBadge variant={
                      reg.registration_status === 'approved' ? 'success' :
                      reg.registration_status === 'pending' ? 'warning' :
                      reg.registration_status === 'withdrawn' ? 'default' : 'danger'
                    }>
                      {reg.registration_status.toUpperCase()}
                    </PsBadge>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                  <div className="flex flex-col gap-1 text-sm text-secondary">
                    <p className="flex items-center gap-1.5">
                      <span className="text-muted">🏆</span>
                      {reg.sport_name} • <span className="capitalize">{reg.participation_type}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted">📅</span>
                      Registered on <time dateTime={reg.registered_at}>{new Date(reg.registered_at).toLocaleDateString()}</time>
                    </p>
                  </div>
                  
                  {['pending', 'approved'].includes(reg.registration_status) && (
                    <PsButton
                      variant="ghost"
                      size="sm"
                      className="text-error hover:bg-error/10 hover:text-error"
                      onClick={() => handleCancel(reg.tournament_id, reg.registration_id)}
                    >
                      Cancel Registration
                    </PsButton>
                  )}
                </div>
              </div>
            </PsCard>
          ))}
        </div>
      )}
    </div>
  );
}
