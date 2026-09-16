import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../store/AuthContext';
import {
  PsButton,
  PsCard,
  PsSelect,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsBackButton
} from '../../components/ui';
import LeaderboardPanel from './LeaderboardPanel';

export default function TournamentDetailsPage() {
  const { tournamentId } = useParams();
  const { user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [myRegistration, setMyRegistration] = useState(null);
  const [myWaitlist, setMyWaitlist] = useState(null);
  const [myTeams, setMyTeams] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await api.get(`/tournaments/${tournamentId}`);
      setTournament(res.data.tournament);

      if (user) {
        try {
          const regRes = await api.get(`/tournaments/${tournamentId}/registrations/my`);
          setMyRegistration(regRes.data.registration);
        } catch (e) {
          if (e.status !== 404 && e.status !== 401) console.error(e);
        }

        try {
          const waitRes = await api.get(`/tournaments/${tournamentId}/waitlist/my`);
          setMyWaitlist(waitRes.data.waitlist_entry);
        } catch (e) {
          if (e.status !== 404 && e.status !== 401) console.error(e);
        }

        if (res.data.tournament.participation_type === 'team') {
          try {
            const teamsRes = await api.get('/teams');
            setMyTeams(teamsRes.data.teams || []);
          } catch (e) {
            if (e.status !== 401) console.error(e);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const handleRegister = async () => {
    if (tournament.participation_type === 'team' && !selectedTeamId) {
      setRegError('Please select a team to register');
      return;
    }

    setRegLoading(true);
    setRegError('');

    try {
      const payload = {};
      if (tournament.participation_type === 'team') {
        payload.team_id = selectedTeamId;
      }

      const res = await api.post(`/tournaments/${tournamentId}/registrations`, payload);

      if (res.payment_required) {
        const orderRes = await api.post(`/tournaments/${tournamentId}/registrations/${res.registration.id}/payment/order`, {});
        const orderData = orderRes.data;

        if (!window.Razorpay) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          document.body.appendChild(script);
          await new Promise((resolve) => script.onload = resolve);
        }

        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.order_id,
          name: 'PlaySphere',
          description: `Tournament Registration Fee`,
          prefill: { email: user?.email || '' },
          theme: { color: '#6E1423' },
          handler: async function (response) {
            try {
              await api.post(`/tournaments/${tournamentId}/registrations/${res.registration.id}/payment/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              await loadData();
            } catch (err) {
              setRegError(err.message || 'Payment verification failed. Contact support.');
              await loadData();
            }
          },
          modal: {
            ondismiss: async function () {
              setRegError('Payment cancelled. Your registration is incomplete.');
              await loadData();
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setRegError(`Payment failed: ${response.error?.description || 'Unknown error'}`);
          loadData();
        });
        rzp.open();
      } else {
        await loadData();
      }
    } catch (err) {
      setRegError(err.data?.error || err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    setRegLoading(true);
    try {
      await api.delete(`/tournaments/${tournamentId}/registrations/${myRegistration.id}`);
      await loadData();
    } catch (err) {
      setRegError(err.message || 'Cancellation failed');
    } finally {
      setRegLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !tournament) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/tournaments" label="Back to Tournaments" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }

  if (!tournament) return null;

  const isOpen = tournament.status === 'registration_open';
  const isOrganizerOrAdmin = user?.roles?.includes('ADMIN') || (user?.roles?.includes('ORGANIZER') && tournament.organizer_user_id === user.id);

  const getSportEmoji = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('football')) return '⚽';
    if (lower.includes('basketball')) return '🏀';
    if (lower.includes('cricket')) return '🏏';
    if (lower.includes('volleyball')) return '🏐';
    return '🏆';
  };

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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PsBackButton to="/tournaments" label="Back to Tournaments" />

      <PsCard>
        <div className="h-40 sm:h-56 bg-maroon/10 border-b border-border relative overflow-hidden flex items-center justify-center rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-maroon/20 to-gold/20" />
          <div className="relative text-6xl drop-shadow-md">
            {getSportEmoji(tournament.sport_name)}
          </div>
        </div>
        
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">{tournament.name}</h1>
            <p className="mt-1 text-sm text-secondary">
              {tournament.sport_name} • {tournament.format.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <PsBadge variant={getStatusBadgeVariant(tournament.status)} className="self-start sm:self-end text-sm px-3 py-1">
              {tournament.status.replace(/_/g, ' ').toUpperCase()}
            </PsBadge>
            <div className="flex gap-2">
              <Link to={`/tournaments/${tournament.id}/matches`}>
                <PsButton variant="secondary">Matches</PsButton>
              </Link>
              {tournament.community_id && (
                <Link to={`/community?community_id=${tournament.community_id}`}>
                  <PsButton variant="secondary">Community</PsButton>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary">Description</p>
            <p className="mt-1 text-sm text-primary whitespace-pre-wrap">
              {tournament.description || 'No description provided.'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Dates</p>
            <p className="mt-1 text-sm text-primary">
              {new Date(tournament.starts_at).toLocaleDateString()} to {new Date(tournament.ends_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Location</p>
            <p className="mt-1 text-sm text-primary">
              {tournament.venue_details ? `${tournament.venue_details}, ${tournament.city}` : (tournament.city || 'TBD')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Participation</p>
            <p className="mt-1 text-sm text-primary capitalize">{tournament.participation_type}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary">Registration Fee</p>
            <p className="mt-1 text-sm text-primary">
              {tournament.registration_fee > 0 ? `₹${tournament.registration_fee}` : 'Free'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary">Registration Window</p>
            <p className="mt-1 text-sm text-primary">
              {new Date(tournament.registration_opens_at).toLocaleDateString()} to {new Date(tournament.registration_closes_at).toLocaleDateString()}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary">Organizer</p>
            <p className="mt-1 text-sm text-primary">{tournament.organizer_name}</p>
          </div>
        </div>
      </PsCard>

      {/* Registration Section */}
      <PsCard className="p-6 border-maroon/20">
        <h2 className="text-xl font-serif font-semibold text-primary mb-4">Registration</h2>

        {regError && <PsAlert variant="error" className="mb-4">{regError}</PsAlert>}

        {myRegistration ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <h3 className="text-sm font-semibold text-success">You are registered</h3>
            <div className="mt-2 text-sm text-success/80 flex flex-col gap-1">
              <p>Status: <span className="font-semibold uppercase">{myRegistration.status}</span></p>
              <p>Eligibility: <span className="font-semibold uppercase">{myRegistration.eligibility_status}</span></p>
            </div>
            <div className="mt-4">
              <PsButton
                variant="danger"
                size="sm"
                onClick={handleCancelRegistration}
                disabled={regLoading}
              >
                {regLoading ? 'Cancelling...' : 'Cancel Registration'}
              </PsButton>
            </div>
          </div>
        ) : myWaitlist ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
            <h3 className="text-sm font-semibold text-warning">You are on the waitlist</h3>
            <div className="mt-2 text-sm text-warning/80 flex flex-col gap-1">
              <p>Position: <span className="font-semibold">{myWaitlist.position}</span></p>
              <p>Status: <span className="font-semibold uppercase">{myWaitlist.status}</span></p>
            </div>
          </div>
        ) : isOpen ? (
          <div>
            {tournament.participation_type === 'team' ? (
              <div className="space-y-4 max-w-sm">
                <PsSelect
                  label="Select Team to Register"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">-- Select Team --</option>
                  {myTeams.filter(t => t.sport_id === tournament.sport_id && t.is_manager).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </PsSelect>
                
                {myTeams.length > 0 && myTeams.filter(t => t.sport_id === tournament.sport_id && t.is_manager).length === 0 && (
                  <p className="text-sm text-error">You manage no teams for this sport.</p>
                )}
                
                <PsButton
                  className="w-full"
                  onClick={handleRegister}
                  disabled={regLoading || !selectedTeamId}
                >
                  {regLoading ? 'Processing...' : 'Register Team'}
                </PsButton>
              </div>
            ) : (
              <div>
                <p className="text-sm text-secondary mb-4">Register as an individual. Your player profile will be evaluated against the tournament eligibility rules.</p>
                <PsButton
                  onClick={handleRegister}
                  disabled={regLoading}
                >
                  {regLoading ? 'Processing...' : 'Register Now'}
                </PsButton>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-secondary p-4 bg-pill-hover rounded-xl border border-border">
            Registration is currently closed for this tournament.
          </div>
        )}
      </PsCard>

      {/* Leaderboards Section */}
      <LeaderboardPanel
        tournamentId={tournamentId}
        tournament={tournament}
        isOrganizerOrAdmin={isOrganizerOrAdmin}
      />
    </div>
  );
}