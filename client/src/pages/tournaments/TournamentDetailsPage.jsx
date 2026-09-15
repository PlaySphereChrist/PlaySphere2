import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../store/AuthContext';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';
import TournamentStatusBadge from '../../components/TournamentStatusBadge';
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

      // Load user-specific data if authenticated
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

      // If payment is required
      if (res.payment_required) {
        const orderRes = await api.post(`/tournaments/${tournamentId}/registrations/${res.registration.id}/payment/order`, {});
        const orderData = orderRes.data;

        // Open Razorpay Checkout
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
          prefill: {
            email: user?.email || '',
          },
          theme: { color: '#4F46E5' },
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

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorMessage message={error} />;
  if (!tournament) return null;

  const isOpen = tournament.status === 'registration_open';
  const isOrganizerOrAdmin =
    user?.roles?.includes('ADMIN') ||
    (user?.roles?.includes('ORGANIZER') && tournament.organizer_user_id === user.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/tournaments" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
        &larr; Back to Tournaments
      </Link>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h3 className="text-2xl font-semibold leading-6 text-gray-900">{tournament.name}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{tournament.sport_name} • {tournament.format.replace(/_/g, ' ')}</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <TournamentStatusBadge status={tournament.status} />
            <Link
              to={`/tournaments/${tournament.id}/matches`}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              View Matches
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 whitespace-pre-wrap">
                {tournament.description || 'No description provided.'}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Dates</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {new Date(tournament.starts_at).toLocaleDateString()} to {new Date(tournament.ends_at).toLocaleDateString()}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {tournament.venue_details ? `${tournament.venue_details}, ${tournament.city}` : (tournament.city || 'TBD')}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Participation</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 capitalize">
                {tournament.participation_type}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Registration Window</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {new Date(tournament.registration_opens_at).toLocaleDateString()} to {new Date(tournament.registration_closes_at).toLocaleDateString()}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Registration Fee</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {tournament.registration_fee > 0 ? `₹${tournament.registration_fee}` : 'Free'}
              </dd>
            </div>
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Organizer</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {tournament.organizer_name}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Registration Section */}
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Registration</h4>

        <ErrorMessage message={regError} className="mb-4" />

        {myRegistration ? (
          <div className="rounded-md bg-green-50 p-4">
            <h3 className="text-sm font-medium text-green-800">You are registered</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Status: <span className="font-semibold uppercase">{myRegistration.status}</span></p>
              <p>Eligibility: <span className="font-semibold uppercase">{myRegistration.eligibility_status}</span></p>
            </div>
            <div className="mt-4">
              <button
                onClick={handleCancelRegistration}
                disabled={regLoading}
                className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
              >
                {regLoading ? 'Cancelling...' : 'Cancel Registration'}
              </button>
            </div>
          </div>
        ) : myWaitlist ? (
          <div className="rounded-md bg-yellow-50 p-4">
            <h3 className="text-sm font-medium text-yellow-800">You are on the waitlist</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Position: <span className="font-semibold">{myWaitlist.position}</span></p>
              <p>Status: <span className="font-semibold uppercase">{myWaitlist.status}</span></p>
            </div>
          </div>
        ) : isOpen ? (
          <div>
            {tournament.participation_type === 'team' ? (
              <div className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Team to Register</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">-- Select Team --</option>
                    {myTeams.filter(t => t.sport_id === tournament.sport_id && t.is_manager).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {myTeams.length > 0 && myTeams.filter(t => t.sport_id === tournament.sport_id && t.is_manager).length === 0 && (
                    <p className="mt-2 text-sm text-red-600">You manage no teams for this sport.</p>
                  )}
                </div>
                <button
                  onClick={handleRegister}
                  disabled={regLoading || !selectedTeamId}
                  className="w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {regLoading ? <Spinner size="sm" /> : 'Register Team'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-4">Register as an individual. Your player profile will be evaluated against the tournament eligibility rules.</p>
                <button
                  onClick={handleRegister}
                  disabled={regLoading}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {regLoading ? <Spinner size="sm" /> : 'Register Now'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            Registration is currently closed for this tournament.
          </div>
        )}
      </div>

      {/* Leaderboards Section */}
      <LeaderboardPanel
        tournamentId={tournamentId}
        tournament={tournament}
        isOrganizerOrAdmin={isOrganizerOrAdmin}
      />
    </div>
  );
}