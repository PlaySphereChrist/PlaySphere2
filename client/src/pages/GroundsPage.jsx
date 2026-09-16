import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PsButton,
  PsCard,
  PsSelect,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../components/ui';

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

  const getSportEmoji = (name) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('football')) return '⚽';
    if (lower.includes('basketball')) return '🏀';
    if (lower.includes('cricket')) return '🏏';
    if (lower.includes('volleyball')) return '🏐';
    return '🏆';
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <PsPageHeader 
          title="Explore Grounds" 
          subtitle="Find and book sports grounds near you."
        />
        <div className="mt-4 sm:mt-0 min-w-[200px]">
          <PsSelect
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            <option value="">All Sports</option>
            {sports.map(sport => (
              <option key={sport.id} value={sport.id}>{sport.name}</option>
            ))}
          </PsSelect>
        </div>
      </div>

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {loading ? (
        <PsLoading />
      ) : grounds.length === 0 ? (
        <PsEmpty
          title="No grounds found"
          message={selectedSport ? 'Try selecting a different sport or clearing the filter.' : 'Check back later for new venues.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {grounds.map((ground) => (
            <PsCard key={ground.id} className="flex flex-col hover:border-maroon/50 transition h-full">
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-serif font-bold text-primary truncate" title={ground.name}>
                  {ground.name}
                </h3>
                <p className="text-sm text-secondary mt-1 flex items-center gap-1.5 truncate">
                  <span className="text-muted">📍</span>
                  {ground.address}, {ground.city}
                </p>
                <div className="mt-4 text-sm text-secondary line-clamp-3">
                  {ground.description || 'No description provided.'}
                </div>
                
                {ground.sports && ground.sports.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 mt-auto pt-4">
                    {ground.sports.map(s => (
                      <PsBadge key={s.id} variant="default" className="text-xs">
                        {getSportEmoji(s.name)} {s.name}
                      </PsBadge>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border bg-pill-hover rounded-b-2xl">
                <Link to={`/grounds/${ground.id}`}>
                  <PsButton className="w-full">
                    View Details & Book
                  </PsButton>
                </Link>
              </div>
            </PsCard>
          ))}
        </div>
      )}
    </div>
  );
}
