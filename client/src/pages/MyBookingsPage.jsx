import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsPageHeader,
  PsLoading,
  PsEmpty
} from '../components/ui';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await api.get('/ground-bookings/me');
        setBookings(res.data.bookings || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  if (loading) return <PsLoading />;
  
  return (
    <div className="space-y-6">
      <PsPageHeader 
        title="My Bookings" 
        subtitle="Manage your ground reservations."
      />

      {error && <PsAlert variant="error">{error}</PsAlert>}

      {bookings.length === 0 ? (
        <PsEmpty
          title="No bookings yet"
          message="You haven't made any ground bookings."
          action={
            <Link to="/grounds">
              <PsButton>Find a Ground</PsButton>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            let dStr = booking.slot_date;
            if (dStr.includes('T')) dStr = dStr.split('T')[0];

            return (
              <PsCard key={booking.id} className="hover:border-maroon/50 transition">
                <Link to={`/bookings/${booking.id}`} className="block px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-lg font-serif font-bold text-primary">
                      {booking.ground_name}
                    </div>
                    <div className="ml-2 flex flex-shrink-0">
                      <PsBadge variant={getStatusVariant(booking.status)}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </PsBadge>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                    <div className="flex flex-col gap-1 text-sm text-secondary">
                      <p className="flex items-center gap-1.5">
                        <span className="text-muted">📅</span>
                        {new Date(dStr).toLocaleDateString()} &bull; {booking.start_time.slice(0,5)} - {booking.end_time.slice(0,5)}
                      </p>
                      {booking.sport_name && (
                        <p className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted">🏆</span>
                          {booking.sport_name}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 flex items-center text-sm font-semibold text-primary sm:mt-0">
                      Total: ₹{booking.total_price}
                    </div>
                  </div>
                </Link>
              </PsCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
