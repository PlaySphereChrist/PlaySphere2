import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import Spinner from '../../../components/Spinner';
import ErrorMessage from '../../../components/ErrorMessage';
import TournamentStatusBadge from '../../../components/TournamentStatusBadge';

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

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorMessage message={error} />;
  if (!tournament) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/organizer/tournaments" className="text-sm text-indigo-600 hover:text-indigo-500 mb-2 inline-block">
            &larr; Back to Managed Tournaments
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">{tournament.name}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <TournamentStatusBadge status={tournament.status} />
          {tournament.status === 'draft' && (
            <Link to={`/organizer/tournaments/${tournamentId}/edit`} className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              Edit Details
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Management & Lifecycle */}
        <div className="space-y-6 lg:col-span-1">
          {/* Lifecycle Card */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Lifecycle Actions</h3>
              
              <div className="space-y-3">
                {tournament.status === 'draft' && (
                  <button
                    onClick={() => handleStatusTransition('registration_open')}
                    disabled={actionLoading || !validation?.valid}
                    className="w-full inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Publish (Open Registration)
                  </button>
                )}
                {tournament.status === 'registration_open' && (
                  <button
                    onClick={() => handleStatusTransition('registration_closed')}
                    disabled={actionLoading}
                    className="w-full inline-flex justify-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 disabled:opacity-50"
                  >
                    Close Registration
                  </button>
                )}
                {tournament.status === 'registration_closed' && (
                  <button
                    onClick={() => handleStatusTransition('in_progress')}
                    disabled={actionLoading}
                    className="w-full inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                  >
                    Start Tournament
                  </button>
                )}
                
                <button
                  onClick={() => handleStatusTransition('cancelled')}
                  disabled={actionLoading || tournament.status === 'cancelled' || tournament.status === 'archived'}
                  className="w-full inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel Tournament
                </button>
              </div>
            </div>
          </div>

          {/* Validation Card */}
          {tournament.status === 'draft' && validation && (
            <div className={`shadow sm:rounded-lg ${validation.valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="px-4 py-5 sm:p-6">
                <h3 className={`text-base font-semibold leading-6 ${validation.valid ? 'text-green-900' : 'text-red-900'}`}>
                  Configuration Status
                </h3>
                {validation.valid ? (
                  <p className="mt-2 text-sm text-green-700">Tournament is ready to be published.</p>
                ) : (
                  <div className="mt-2 text-sm text-red-700">
                    <p>Cannot publish until the following are resolved:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {validation.missing.map(m => <li key={m}>Missing: {m}</li>)}
                      {validation.errors.map(e => <li key={e}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Registrations & Waitlist */}
        <div className="space-y-6 lg:col-span-2">
          {/* Registrations */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:border-b sm:border-gray-200 sm:px-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Registrations ({registrations.length} {tournament.max_teams ? `/ ${tournament.max_teams}` : ''})
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-0">
              {registrations.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">No registrations yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {registrations.map(reg => (
                    <li key={reg.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{reg.registration_name}</p>
                        <p className="text-xs text-gray-500">Registered {new Date(reg.registered_at).toLocaleString()}</p>
                      </div>
                      <div className="flex space-x-2">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          {reg.status}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          {reg.eligibility_status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Waitlist */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:border-b sm:border-gray-200 sm:px-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Waitlist ({waitlist.length})
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-0">
              {waitlist.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">Waitlist is empty.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {waitlist.map(w => (
                    <li key={w.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">#{w.position} - {w.participant_name}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        {w.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
