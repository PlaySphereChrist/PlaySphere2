import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';

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

  if (loading) return <div className="py-12"><Spinner size="lg" /></div>;
  
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">My Registrations</h1>
      
      <ErrorMessage message={error} />
      
      {registrations.length === 0 && !error ? (
        <EmptyState 
          title="No registrations found" 
          description="You haven't registered for any tournaments yet." 
          actionText="Browse Tournaments" 
          actionLink="/tournaments"
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {registrations.map((reg) => (
              <li key={reg.registration_id}>
                <div className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        <Link to={`/tournaments/${reg.tournament_id}`}>{reg.tournament_name}</Link>
                      </p>
                      <div className="ml-2 flex flex-shrink-0">
                        <p className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          reg.registration_status === 'approved' ? 'bg-green-100 text-green-800' :
                          reg.registration_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          reg.registration_status === 'withdrawn' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {reg.registration_status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {reg.sport_name} • {reg.participation_type}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          Registered on <time dateTime={reg.registered_at}>{new Date(reg.registered_at).toLocaleDateString()}</time>
                        </p>
                        {['pending', 'approved'].includes(reg.registration_status) && (
                          <button
                            onClick={() => handleCancel(reg.tournament_id, reg.registration_id)}
                            className="ml-4 text-red-600 hover:text-red-900 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
