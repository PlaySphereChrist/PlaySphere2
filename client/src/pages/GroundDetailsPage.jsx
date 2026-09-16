import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PsButton,
  PsCard,
  PsTextarea,
  PsBadge,
  PsAlert,
  PsLoading,
  PsBackButton
} from '../components/ui';

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

  const slotsByDate = slots.reduce((acc, slot) => {
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
      navigate(`/bookings/${res.data.booking.id}`);
    } catch (err) {
      setBookingError(err.message || 'Booking failed');
      if (err.status === 409) {
        setSelectedSlotId('');
        fetchDetailsAndSlots();
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <PsLoading />;
  
  if (error && !ground) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/grounds" label="Back to Grounds" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }

  if (!ground) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PsBackButton to="/grounds" label="Back to Grounds" />

      <PsCard>
        <div className="h-48 sm:h-64 bg-maroon/10 border-b border-border relative overflow-hidden flex flex-col justify-end p-6 rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white drop-shadow-md">
              {ground.name}
            </h1>
            <p className="mt-2 text-white/90 flex items-center gap-1.5 drop-shadow-sm">
              <span>📍</span>
              {ground.address}, {ground.city} {ground.state ? `, ${ground.state}` : ''}
            </p>
          </div>
        </div>
        <div className="p-6">
          <p className="text-primary leading-relaxed whitespace-pre-wrap">
            {ground.description || 'No description provided.'}
          </p>
          
          {ground.sports && ground.sports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-secondary mb-3">Supported Sports</h3>
              <div className="flex flex-wrap gap-2">
                {ground.sports.map(s => (
                  <PsBadge key={s.id} variant="default">
                    {s.name} {s.surface_type ? `(${s.surface_type})` : ''}
                  </PsBadge>
                ))}
              </div>
            </div>
          )}
        </div>
      </PsCard>

      <PsCard className="p-6 border-maroon/20">
        <h2 className="text-2xl font-serif font-bold text-primary mb-6">Book a Slot</h2>

        {dates.length === 0 ? (
          <div className="text-sm text-secondary py-8 bg-surface border border-dashed border-border rounded-xl text-center">
            No available slots at this time.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-primary mb-3">Select Date</label>
                <div className="flex overflow-x-auto gap-2 pb-2">
                  {dates.map(date => (
                    <button
                      key={date}
                      onClick={() => { setSelectedDate(date); setSelectedSlotId(''); }}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition ${
                        activeDate === date
                          ? 'bg-maroon text-white shadow-md'
                          : 'bg-surface border border-border text-secondary hover:bg-pill-hover hover:text-primary'
                      }`}
                    >
                      {new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-3">
                  Available Slots for {new Date(activeDate).toLocaleDateString()}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeSlots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-sm transition ${
                        selectedSlotId === slot.id
                          ? 'border-maroon bg-maroon/5 text-maroon shadow-inner ring-1 ring-maroon/50'
                          : 'border-border bg-surface text-primary hover:border-maroon/50 hover:bg-pill-hover'
                      }`}
                    >
                      <span className="font-bold">{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</span>
                      <span className="text-xs mt-1 text-secondary">{slot.sport_name || 'General'}</span>
                      <span className="text-sm font-semibold mt-1 text-primary">₹{slot.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm sticky top-6">
                <h3 className="text-lg font-serif font-bold text-primary mb-4 border-b border-border pb-3">Booking Summary</h3>
                {selectedSlot ? (
                  <form onSubmit={handleBook} className="space-y-4">
                    <div className="text-sm space-y-3">
                      <div className="flex justify-between">
                        <span className="text-secondary">Date</span>
                        <span className="font-medium text-primary">{new Date(activeDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Time</span>
                        <span className="font-medium text-primary">{selectedSlot.start_time.slice(0,5)} - {selectedSlot.end_time.slice(0,5)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Sport</span>
                        <span className="font-medium text-primary">{selectedSlot.sport_name || 'General'}</span>
                      </div>
                      <div className="flex justify-between pt-3 mt-3 border-t border-border">
                        <span className="text-secondary font-medium">Total Price</span>
                        <span className="font-bold text-xl text-primary">₹{selectedSlot.price}</span>
                      </div>
                      <p className="text-xs text-secondary bg-pill p-2 rounded-lg mt-2">
                        Note: An advance payment of 50% will be created upon booking.
                      </p>
                    </div>

                    <div className="pt-2">
                      <PsTextarea
                        label="Notes (Optional)"
                        rows={2}
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                      />
                    </div>

                    {bookingError && <PsAlert variant="error">{bookingError}</PsAlert>}

                    <PsButton
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full"
                    >
                      {bookingLoading ? 'Processing...' : 'Confirm Booking'}
                    </PsButton>
                  </form>
                ) : (
                  <div className="text-sm text-secondary text-center py-8">
                    Select a slot to view summary and proceed.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PsCard>
    </div>
  );
}
