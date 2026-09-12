import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/AuthContext';

export default function CasualGamesPage() {
  const [games, setGames] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [sportId, setSportId] = useState('');
  const [status, setStatus] = useState('open');
  const [skillLevel, setSkillLevel] = useState('');
  const [date, setDate] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await api.get('/sports');
        setSports(res.data.sports);
      } catch (err) {
        console.error('Failed to load sports', err);
      }
    };

    const fetchGames = async () => {
      try {
        setLoading(true);
        const params = new window.URLSearchParams();
        if (sportId) params.append('sport_id', sportId);
        if (status) params.append('status', status);
        if (skillLevel) params.append('skill_level', skillLevel);
        if (date) params.append('date', date);

        const res = await api.get(`/casual-games?${params.toString()}`);
        setGames(res.data.games);
        setError('');
      } catch (err) {
        setError(err.data?.error || err.message || 'Failed to load games');
      } finally {
        setLoading(false);
      }
    };

    fetchSports();
    fetchGames();
  }, [sportId, status, skillLevel, date]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Casual Games</h1>
        <Link
          to="/casual-games/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Create Game
        </Link>
      </div>

      <div className="bg-white p-4 shadow sm:rounded-md mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sport</label>
            <select
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Sports</option>
              {sports.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="open">Open</option>
              <option value="full">Full</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="">All Statuses</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Skill Level</label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
              <option value="Professional">Professional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-6 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="text-center py-10 bg-white shadow sm:rounded-md text-gray-500">
          No casual games found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map(game => (
            <div key={game.id} className="bg-white overflow-hidden shadow rounded-lg flex flex-col">
              <div className="px-4 py-5 sm:p-6 flex-grow">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {game.sport_name}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    game.status === 'open' ? 'bg-green-100 text-green-800' :
                    game.status === 'full' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {game.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 truncate" title={game.title}>{game.title}</h3>
                <div className="mt-2 text-sm text-gray-500 space-y-1">
                  <p>📅 {new Date(game.scheduled_at).toLocaleDateString()} at {new Date(game.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p>📍 {game.location_name}</p>
                  <p>⭐ {game.skill_level}</p>
                  <p>👥 {game.current_participants} / {game.max_participants} Players</p>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  By {game.creator_id === user?.id ? 'You' : game.creator_name}
                </div>
                <Link
                  to={`/casual-games/${game.id}`}
                  className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
