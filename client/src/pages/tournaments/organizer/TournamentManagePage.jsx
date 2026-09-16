import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsLoading,
  PsBackButton
} from '../../../components/ui';

export default function TournamentManagePage() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [validation, setValidation] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, vRes, rRes, wRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}`),
        api.get(`/tournaments/${tournamentId}/configuration/validation`),
        api.get(`/tournaments/${tournamentId}/registrations`),
        api.get(`/tournaments/${tournamentId}/waitlist`)
      ]);
      setTournament(tRes.data.tournament);
      setValidation(vRes.data);
      setRegistrations(rRes.data.registrations || []);
      setWaitlist(wRes.data.waitlist || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load tournament management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const handleStatusTransition = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;
    
    setActionLoading(true);
    try {
      await api.patch(`/tournaments/${tournamentId}`, { status: newStatus });
      await loadData();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !tournament) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/organizer/tournaments" label="Back to Managed Tournaments" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }

  if (!tournament) return null;

  const getStatusBadgeVariant = (s) => {
    switch (s) {
      case 'registration_open': return 'success';
      case 'in_progress': return 'maroon';
      case 'completed': return 'default';
      case 'cancelled': return 'danger';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PsBackButton to="/organizer/tournaments" label="Back to Managed Tournaments" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary">{tournament.name}</h1>
          <p className="mt-1 text-sm text-secondary">
            Manage your tournament lifecycle, registrations, and waitlist.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PsBadge variant={getStatusBadgeVariant(tournament.status)} className="text-sm px-3 py-1">
            {tournament.status.replace(/_/g, ' ').toUpperCase()}
          </PsBadge>
          {tournament.status === 'draft' && (
            <Link to={`/organizer/tournaments/${tournamentId}/edit`}>
              <PsButton variant="secondary">Edit Details</PsButton>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Management & Lifecycle */}
        <div className="space-y-6 lg:col-span-1">
          {/* Lifecycle Card */}
          <PsCard className="p-6">
            <h3 className="text-lg font-serif font-semibold text-primary mb-4">Lifecycle Actions</h3>
            
            <div className="space-y-3">
              {tournament.status === 'draft' && (
                <PsButton
                  className="w-full"
                  onClick={() => handleStatusTransition('registration_open')}
                  disabled={actionLoading || !validation?.valid}
                >
                  Publish (Open Registration)
                </PsButton>
              )}
              {tournament.status === 'registration_open' && (
                <PsButton
                  className="w-full"
                  style={{ backgroundColor: '#D97706', color: 'white' }}
                  onClick={() => handleStatusTransition('registration_closed')}
                  disabled={actionLoading}
                >
                  Close Registration
                </PsButton>
              )}
              {tournament.status === 'registration_closed' && (
                <PsButton
                  className="w-full"
                  style={{ backgroundColor: '#2563EB', color: 'white' }}
                  onClick={() => handleStatusTransition('in_progress')}
                  disabled={actionLoading}
                >
                  Start Tournament
                </PsButton>
              )}
              
              <PsButton
                variant="ghost"
                className="w-full text-error border border-error/50 hover:bg-error/10"
                onClick={() => handleStatusTransition('cancelled')}
                disabled={actionLoading || tournament.status === 'cancelled' || tournament.status === 'archived'}
              >
                Cancel Tournament
              </PsButton>
            </div>
          </PsCard>

          {/* Validation Card */}
          {tournament.status === 'draft' && validation && (
            <PsCard className={`p-6 border ${validation.valid ? 'border-success/50 bg-success/5' : 'border-error/50 bg-error/5'}`}>
              <h3 className={`text-lg font-serif font-semibold ${validation.valid ? 'text-success' : 'text-error'}`}>
                Configuration Status
              </h3>
              {validation.valid ? (
                <p className="mt-2 text-sm text-success">Tournament is ready to be published.</p>
              ) : (
                <div className="mt-2 text-sm text-error/90">
                  <p>Cannot publish until the following are resolved:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {validation.missing.map(m => <li key={m}>Missing: {m}</li>)}
                    {validation.errors.map(e => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
            </PsCard>
          )}
        </div>

        {/* Right Column: Registrations & Waitlist */}
        <div className="space-y-6 lg:col-span-2">
          {/* Registrations */}
          <PsCard>
            <div className="px-6 py-4 border-b border-border bg-pill-hover rounded-t-2xl">
              <h3 className="font-semibold text-primary">
                Registrations ({registrations.length} {tournament.max_teams ? `/ ${tournament.max_teams}` : ''})
              </h3>
            </div>
            <div>
              {registrations.length === 0 ? (
                <p className="p-6 text-sm text-secondary text-center">No registrations yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {registrations.map(reg => (
                    <li key={reg.id} className="px-6 py-4 flex items-center justify-between hover:bg-pill-hover transition">
                      <div>
                        <p className="font-medium text-primary">{reg.registration_name}</p>
                        <p className="text-xs text-secondary mt-1">Registered {new Date(reg.registered_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
                        <PsBadge variant={
                          reg.status === 'approved' ? 'success' :
                          reg.status === 'pending' ? 'warning' :
                          reg.status === 'withdrawn' ? 'default' : 'danger'
                        }>
                          {reg.status}
                        </PsBadge>
                        <PsBadge variant="default" className="text-xs">
                          {reg.eligibility_status}
                        </PsBadge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PsCard>

          {/* Waitlist */}
          <PsCard>
            <div className="px-6 py-4 border-b border-border bg-pill-hover rounded-t-2xl">
              <h3 className="font-semibold text-primary">
                Waitlist ({waitlist.length})
              </h3>
            </div>
            <div>
              {waitlist.length === 0 ? (
                <p className="p-6 text-sm text-secondary text-center">Waitlist is empty.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {waitlist.map(w => (
                    <li key={w.id} className="px-6 py-4 flex items-center justify-between hover:bg-pill-hover transition">
                      <div>
                        <p className="font-medium text-primary">#{w.position} - {w.participant_name}</p>
                      </div>
                      <PsBadge variant="warning">
                        {w.status}
                      </PsBadge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PsCard>
          
        </div>
      </div>
    </div>
  );
}
