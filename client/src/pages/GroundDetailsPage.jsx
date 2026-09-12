import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

export default function GroundDetailsPage() {
  const { groundId } = useParams();
  const navigate = useNavigate();

  const [ground, setGround] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const fetchDetailsAndSlots = async () => {
    try {
      setLoading(true);
      const groundData = await api.get(`/grounds/${groundId}`);
      setGround(groundData.data.ground);

      const slotsData = await api.get(`/grounds/${groundId}/slots?available_only=true`);
      setSlots(slotsData.data.slots || []);
    } catch (err) {
      setError(err.message || 'Failed to load ground details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailsAndSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundId]);

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    // pg DATE format is YYYY-MM-DDT00:00:00.000Z generally, we extract just the date part
    let dStr = slot.slot_date;
    if (dStr.includes('T')) dStr = dStr.split('T')[0];
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(slot);
    return acc;
  }, {});

  const dates = Object.keys(slotsByDate).sort();
  const activeDate = selectedDate || (dates.length > 0 ? dates[0] : '');
  const activeSlots = activeDate ? slotsByDate[activeDate] : [];
  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSlotId) return;

    try {
      setBookingLoading(true);
      setBookingError('');
      const res = await api.post(`/grounds/${groundId}/bookings`, {
        slot_id: selectedSlotId,
        notes: bookingNotes
      });
      // Navigate to booking details on success
      navigate(`/bookings/${res.data.booking.id}`);
    } catch (err) {
      setBookingError(err.message || 'Booking failed');
      // If conflict (someone else booked it), refresh slots
      if (err.status === 409) {
        setSelectedSlotId('');
        fetchDetailsAndSlots();
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;
  if (!ground) return <div className="text-gray-500 py-12 text-center">Ground not found.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-6 sm:px-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">{ground.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {ground.address}, {ground.city} {ground.state ? `, ${ground.state}` : ''}
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6 text-gray-700 space-y-4">
          <p>{ground.description || 'No description provided.'}</p>
          
          {ground.sports && ground.sports.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Supported Sports</h3>
              <div className="flex flex-wrap gap-2">
                {ground.sports.map(s => (
                  <span key={s.id} className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                    {s.name} {s.surface_type ? `(${s.surface_type})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Book a Slot</h2>

          {dates.length === 0 ? (
            <div className="text-sm text-gray-500 py-4">No available slots at this time.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">Select Date</label>
                  <div className="flex overflow-x-auto gap-2 pb-2">
                    {dates.map(date => (
                      <button
                        key={date}
                        onClick={() => { setSelectedDate(date); setSelectedSlotId(''); }}
                        className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium ${
                          activeDate === date
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">Available Slots for {new Date(activeDate).toLocaleDateString()}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeSlots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-md border text-sm ${
                          selectedSlotId === slot.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                            : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-semibold">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</span>
                        <span className="text-xs mt-1 text-gray-500">{slot.sport_name || 'General'}</span>
                        <span className="text-xs font-medium mt-1">₹{slot.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Summary</h3>
                  {selectedSlot ? (
                    <form onSubmit={handleBook} className="space-y-4">
                      <div className="text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-500">Date</span>
                          <span className="font-medium text-gray-900">{new Date(activeDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-500">Time</span>
                          <span className="font-medium text-gray-900">{selectedSlot.start_time.slice(0,5)} - {selectedSlot.end_time.slice(0,5)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-500">Sport</span>
                          <span className="font-medium text-gray-900">{selectedSlot.sport_name || 'General'}</span>
                        </div>
                        <div className="flex justify-between py-2 mt-2">
                          <span className="text-gray-500">Total Price</span>
                          <span className="font-bold text-gray-900">₹{selectedSlot.price}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Note: An advance payment of 50% will be created upon booking.</p>
                      </div>

                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium leading-6 text-gray-900">
                          Notes (Optional)
                        </label>
                        <div className="mt-2">
                          <textarea
                            id="notes"
                            rows={2}
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>

                      {bookingError && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{bookingError}</div>
                      )}

                      <button
                        type="submit"
                        disabled={bookingLoading}
                        className="w-full flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                      >
                        {bookingLoading ? 'Processing...' : 'Confirm Booking'}
                      </button>
                    </form>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8">
                      Select a slot to view summary and proceed.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
