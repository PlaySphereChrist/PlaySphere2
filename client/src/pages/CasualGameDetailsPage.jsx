import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store/AuthContext';

export default function CasualGameDetailsPage() {
  const { gameId } = useParams();
  const { user } = useAuth();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/casual-games/${gameId}`);
        setGame(res.data.game);
        setError('');
      } catch (err) {
        setError(err.data?.error || err.message || 'Failed to load game details');
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [gameId]);

  const handleJoin = async () => {
    try {
      setActionLoading(true);
      await api.post(`/casual-games/${gameId}/join`);
      window.location.reload();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to join game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this game?')) return;
    try {
      setActionLoading(true);
      await api.post(`/casual-games/${gameId}/leave`);
      window.location.reload();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to leave game');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this game? This cannot be undone.')) return;
    try {
      setActionLoading(true);
      await api.post(`/casual-games/${gameId}/cancel`);
      window.location.reload();
    } catch (err) {
      window.alert(err.data?.error || err.message || 'Failed to cancel game');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading game...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!game) return <div className="p-8 text-center">Game not found</div>;

  const isCreator = user?.id === game.organized_by_user_id;
  const isParticipant = game.participants?.some(p => p.user_id === user?.id);

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-2xl leading-6 font-bold text-gray-900">{game.title}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {game.sport_name} • Organized by {isCreator ? 'You' : game.creator_name}
            </p>
          </div>
          <div className="flex space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              game.status === 'open' ? 'bg-green-100 text-green-800' :
              game.status === 'full' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {game.status.toUpperCase()}
            </span>
            
            {isCreator && game.status !== 'cancelled' && game.status !== 'completed' && (
              <>
                <Link
                  to={`/casual-games/${game.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Edit
                </Link>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  Cancel Game
                </button>
              </>
            )}
            
            {!isCreator && isParticipant && game.status !== 'cancelled' && game.status !== 'completed' && (
              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
              >
                Leave Game
              </button>
            )}
            
            {!isCreator && !isParticipant && game.status === 'open' && (
              <button
                onClick={handleJoin}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                Join Game
              </button>
            )}
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(game.scheduled_at).toLocaleDateString()} at {new Date(game.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {game.location_name}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Skill Level</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {game.skill_level}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Participants</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {game.current_participants} / {game.max_participants} ({(game.max_participants - game.current_participants)} slots available)
              </dd>
            </div>
            {game.description && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">
                  {game.description}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Players ({game.participants?.length || 0})</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {game.participants?.map((participant) => (
            <li key={participant.participant_id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {participant.avatar_url ? (
                    <img src={participant.avatar_url} alt="" className="h-10 w-10 object-cover" />
                  ) : (
                    <span className="text-gray-500 font-medium text-lg">{participant.user_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">
                    {participant.user_name} {participant.user_id === game.organized_by_user_id && '(Organizer)'}
                  </div>
                  {participant.player_skill_level && (
                    <div className="text-sm text-gray-500 capitalize">{participant.player_skill_level}</div>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Joined {new Date(participant.joined_at).toLocaleDateString()}
              </div>
            </li>
          ))}
          {!game.participants?.length && (
            <li className="px-4 py-4 sm:px-6 text-sm text-gray-500 text-center">No participants yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}
