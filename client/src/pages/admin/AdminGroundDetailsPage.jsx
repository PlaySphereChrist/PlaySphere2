import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import Spinner from '../../components/Spinner';

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

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;
  if (!ground) return <div className="text-gray-500 py-12 text-center">Ground not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manage: {ground.name}</h1>
        <button onClick={() => navigate('/admin/grounds')} className="text-sm font-medium text-indigo-600">
          &larr; Back to Grounds
        </button>
      </div>

      <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Details</h3>
            <p className="mt-1 text-sm text-gray-500">{ground.address}, {ground.city}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleStatus}
              className={`px-3 py-1 rounded text-sm font-medium ${ground.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
            >
              {ground.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={handleDeleteGround}
              className="px-3 py-1 rounded text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sports Management */}
        <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Supported Sports</h3>
          <ul className="divide-y divide-gray-200 mb-4 border-t border-b">
            {ground.sports?.map(sport => (
              <li key={sport.id} className="py-3 flex justify-between items-center">
                <span className="text-sm font-medium">{sport.name}</span>
                <button onClick={() => handleRemoveSport(sport.id)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
              </li>
            ))}
            {(!ground.sports || ground.sports.length === 0) && (
              <li className="py-3 text-sm text-gray-500">No sports configured.</li>
            )}
          </ul>
          
          <form onSubmit={handleAddSport} className="flex gap-2">
            <select
              value={selectedSportId}
              onChange={(e) => setSelectedSportId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a sport...</option>
              {allSports
                .filter(s => !ground.sports?.find(gs => gs.id === s.id))
                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Add
            </button>
          </form>
          {sportError && <p className="mt-2 text-sm text-red-600">{sportError}</p>}
        </div>

        {/* Slot Management */}
        <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Booking Slot</h3>
          <form onSubmit={handleAddSlot} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input required type="date" value={slotData.slot_date} onChange={(e) => setSlotData({...slotData, slot_date: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sport (Optional)</label>
                <select value={slotData.sport_id} onChange={(e) => setSlotData({...slotData, sport_id: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm">
                  <option value="">General (Any)</option>
                  {ground.sports?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input required type="time" value={slotData.start_time} onChange={(e) => setSlotData({...slotData, start_time: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input required type="time" value={slotData.end_time} onChange={(e) => setSlotData({...slotData, end_time: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                <input required type="number" min="0" step="0.01" value={slotData.price} onChange={(e) => setSlotData({...slotData, price: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
              </div>
            </div>
            {slotError && <p className="text-sm text-red-600">{slotError}</p>}
            <button type="submit" className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Create Slot
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Slots</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {slots.map(slot => {
                let dStr = slot.slot_date;
                if (dStr.includes('T')) dStr = dStr.split('T')[0];
                
                return (
                  <tr key={slot.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(dStr).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">₹{slot.price}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${slot.is_available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {slot.is_available ? 'Available' : 'Booked'}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <button onClick={() => handleDeleteSlot(slot.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {slots.length === 0 && (
                <tr><td colSpan="5" className="py-4 text-center text-sm text-gray-500">No slots configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
