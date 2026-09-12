import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

export default function GroundsPage() {
  const [grounds, setGrounds] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const sportsData = await api.get('/sports');
        setSports(sportsData.data.sports || []);

        const url = selectedSport ? `/grounds?sport_id=${selectedSport}` : '/grounds';
        const groundsData = await api.get(url);
        setGrounds(groundsData.data.grounds || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch grounds');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedSport]);

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Explore Grounds</h1>
          <p className="mt-2 text-sm text-gray-700">Find and book sports grounds near you.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="">All Sports</option>
            {sports.map(sport => (
              <option key={sport.id} value={sport.id}>{sport.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : grounds.length === 0 ? (
        <div className="text-center py-12 bg-white shadow rounded-lg border border-gray-200">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No grounds found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedSport ? 'Try selecting a different sport or clearing the filter.' : 'Check back later for new venues.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {grounds.map((ground) => (
            <div key={ground.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 flex flex-col">
              <div className="px-4 py-5 sm:p-6 flex-grow">
                <h3 className="text-lg font-bold text-gray-900 truncate">{ground.name}</h3>
                <p className="text-sm text-gray-500 mt-1 truncate">{ground.address}, {ground.city}</p>
                <div className="mt-4 text-sm text-gray-700 line-clamp-3">
                  {ground.description || 'No description provided.'}
                </div>
                
                {ground.sports && ground.sports.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ground.sports.map(s => (
                      <span key={s.id} className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6 mt-auto">
                <Link
                  to={`/grounds/${ground.id}`}
                  className="block text-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  View Details & Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
