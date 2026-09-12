import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-2 text-sm text-gray-700">Manage your ground reservations.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white shadow rounded-lg border border-gray-200">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No bookings yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            You haven&apos;t made any ground bookings.
          </p>
          <div className="mt-6">
            <Link
              to="/grounds"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Find a Ground
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
          <ul role="list" className="divide-y divide-gray-200">
            {bookings.map((booking) => {
              let dStr = booking.slot_date;
              if (dStr.includes('T')) dStr = dStr.split('T')[0];

              return (
                <li key={booking.id}>
                  <Link to={`/bookings/${booking.id}`} className="block hover:bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="truncate text-sm font-medium text-indigo-600">
                        {booking.ground_name}
                      </div>
                      <div className="ml-2 flex flex-shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {new Date(dStr).toLocaleDateString()}
                          <span className="mx-2">&bull;</span>
                          {booking.start_time.slice(0,5)} - {booking.end_time.slice(0,5)}
                        </p>
                        {booking.sport_name && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:ml-6 sm:mt-0">
                            {booking.sport_name}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        Total: ₹{booking.total_price}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
