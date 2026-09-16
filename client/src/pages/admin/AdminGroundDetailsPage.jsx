import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  PsButton,
  PsCard,
  PsInput,
  PsSelect,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsBackButton
} from '../../components/ui';

export default function AdminGroundDetailsPage() {
  const { groundId } = useParams();
  const navigate = useNavigate();

  const [ground, setGround] = useState(null);
  const [allSports, setAllSports] = useState([]);
  const [slots, setSlots] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sport form
  const [selectedSportId, setSelectedSportId] = useState('');
  const [sportError, setSportError] = useState('');

  // Slot form
  const [slotData, setSlotData] = useState({ slot_date: '', start_time: '', end_time: '', price: '', sport_id: '' });
  const [slotError, setSlotError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groundRes, sportsRes, slotsRes] = await Promise.all([
        api.get(`/grounds/${groundId}`),
        api.get('/sports'),
        api.get(`/grounds/${groundId}/slots`)
      ]);
      setGround(groundRes.data.ground);
      setAllSports(sportsRes.data.sports);
      setSlots(slotsRes.data.slots);
    } catch (err) {
      setError(err.message || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundId]);

  const handleToggleStatus = async () => {
    try {
      await api.patch(`/grounds/${groundId}`, { is_active: !ground.is_active });
      fetchData();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleAddSport = async (e) => {
    e.preventDefault();
    if (!selectedSportId) return;
    try {
      setSportError('');
      await api.post(`/grounds/${groundId}/sports`, { sport_id: selectedSportId });
      setSelectedSportId('');
      fetchData();
    } catch (err) {
      setSportError(err.message);
    }
  };

  const handleRemoveSport = async (sportId) => {
    if (!window.confirm('Remove this sport?')) return;
    try {
      await api.delete(`/grounds/${groundId}/sports/${sportId}`);
      fetchData();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      setSlotError('');
      await api.post(`/grounds/${groundId}/slots`, slotData);
      setSlotData({ slot_date: '', start_time: '', end_time: '', price: '', sport_id: '' });
      fetchData();
    } catch (err) {
      setSlotError(err.message);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Delete this slot?')) return;
    try {
      await api.delete(`/grounds/${groundId}/slots/${slotId}`);
      fetchData();
    } catch (err) {
      window.alert(err.message);
    }
  };

  const handleDeleteGround = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this ground? This cannot be undone.')) return;
    try {
      await api.delete(`/grounds/${groundId}`);
      navigate('/admin/grounds');
    } catch (err) {
      window.alert(err.message || 'Cannot delete ground (it may have active bookings). Try deactivating instead.');
    }
  };

  if (loading) return <PsLoading />;
  if (error && !ground) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/admin/grounds" label="Back to Grounds" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }
  
  if (!ground) return null;

  return (
    <div className="space-y-6 pb-12">
      <PsBackButton to="/admin/grounds" label="Back to Grounds" />
      <PsPageHeader title={`Manage: ${ground.name}`} />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      <PsCard className="p-6 border-l-4 border-l-gold">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="text-xl font-serif font-bold text-primary">Details</h3>
            <p className="mt-1 text-sm text-secondary">{ground.address}, {ground.city}</p>
          </div>
          <div className="flex gap-2">
            <PsButton
              variant={ground.is_active ? 'warning' : 'primary'}
              onClick={handleToggleStatus}
            >
              {ground.is_active ? 'Deactivate' : 'Activate'}
            </PsButton>
            <PsButton
              variant="danger"
              onClick={handleDeleteGround}
            >
              Delete
            </PsButton>
          </div>
        </div>
      </PsCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sports Management */}
        <PsCard className="p-6">
          <h3 className="text-lg font-serif font-bold text-primary mb-4">Supported Sports</h3>
          <ul className="divide-y divide-border mb-4 border-t border-b border-border">
            {ground.sports?.map(sport => (
              <li key={sport.id} className="py-3 flex justify-between items-center">
                <span className="text-sm font-medium text-primary">{sport.name}</span>
                <button onClick={() => handleRemoveSport(sport.id)} className="text-error hover:text-error/80 text-sm font-medium">Remove</button>
              </li>
            ))}
            {(!ground.sports || ground.sports.length === 0) && (
              <li className="py-4 text-sm text-secondary italic text-center">No sports configured.</li>
            )}
          </ul>
          
          <form onSubmit={handleAddSport} className="flex gap-2 items-end">
            <div className="flex-1">
              <PsSelect
                label="Add Sport"
                value={selectedSportId}
                onChange={(e) => setSelectedSportId(e.target.value)}
              >
                <option value="">Select a sport...</option>
                {allSports
                  .filter(s => !ground.sports?.find(gs => gs.id === s.id))
                  .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </PsSelect>
            </div>
            <PsButton type="submit">Add</PsButton>
          </form>
          {sportError && <PsAlert variant="error" className="mt-4">{sportError}</PsAlert>}
        </PsCard>

        {/* Slot Management */}
        <PsCard className="p-6">
          <h3 className="text-lg font-serif font-bold text-primary mb-4">Add Booking Slot</h3>
          <form onSubmit={handleAddSlot} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <PsInput 
                label="Date" 
                required 
                type="date" 
                value={slotData.slot_date} 
                onChange={(e) => setSlotData({...slotData, slot_date: e.target.value})} 
              />
              <PsSelect 
                label="Sport (Optional)" 
                value={slotData.sport_id} 
                onChange={(e) => setSlotData({...slotData, sport_id: e.target.value})}
              >
                <option value="">General (Any)</option>
                {ground.sports?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </PsSelect>
              <PsInput 
                label="Start Time" 
                required 
                type="time" 
                value={slotData.start_time} 
                onChange={(e) => setSlotData({...slotData, start_time: e.target.value})} 
              />
              <PsInput 
                label="End Time" 
                required 
                type="time" 
                value={slotData.end_time} 
                onChange={(e) => setSlotData({...slotData, end_time: e.target.value})} 
              />
              <div className="col-span-2">
                <PsInput 
                  label="Price (₹)" 
                  required 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={slotData.price} 
                  onChange={(e) => setSlotData({...slotData, price: e.target.value})} 
                />
              </div>
            </div>
            {slotError && <PsAlert variant="error">{slotError}</PsAlert>}
            <div className="pt-2">
              <PsButton type="submit" className="w-full">
                Create Slot
              </PsButton>
            </div>
          </form>
        </PsCard>
      </div>

      <PsCard>
        <div className="px-6 py-4 border-b border-border bg-pill-hover rounded-t-2xl">
          <h3 className="text-lg font-serif font-bold text-primary">Existing Slots</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="bg-surface">
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {slots.map(slot => {
                let dStr = slot.slot_date;
                if (dStr.includes('T')) dStr = dStr.split('T')[0];
                
                return (
                  <tr key={slot.id} className="hover:bg-pill-hover transition">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary font-medium">{new Date(dStr).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-secondary">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-primary font-bold">₹{slot.price}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <PsBadge variant={slot.is_available ? 'success' : 'default'}>
                        {slot.is_available ? 'Available' : 'Booked'}
                      </PsBadge>
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button onClick={() => handleDeleteSlot(slot.id)} className="text-error hover:text-error/80 transition font-bold">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {slots.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-sm text-secondary italic">
                    No slots configured for this ground yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PsCard>
    </div>
  );
}
