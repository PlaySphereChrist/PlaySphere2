import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

export default function BookingDetailsPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelResult, setCancelResult] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/ground-bookings/${bookingId}`);
      setBooking(res.data.booking);
    } catch (err) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleCancel = async (e) => {
    e.preventDefault();
    try {
      setCancelling(true);
      setCancelError('');
      const res = await api.post(`/ground-bookings/${bookingId}/cancel`, {
        reason: cancelReason
      });
      setCancelResult(res.message);
      setShowCancelModal(false);
      fetchBooking();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;
  if (!booking) return <div className="text-gray-500 py-12 text-center">Booking not found.</div>;

  let dStr = booking.slot_date;
  if (dStr.includes('T')) dStr = dStr.split('T')[0];
  const bookingDate = new Date(dStr);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isCancellable = ['pending', 'confirmed'].includes(booking.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
        <button
          onClick={() => navigate('/bookings')}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to Bookings
        </button>
      </div>

      {cancelResult && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm font-medium text-green-800">{cancelResult}</div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {booking.ground_name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Booking ID: {booking.id}
            </p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(booking.status)}`}>
            {booking.status.toUpperCase()}
          </span>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {bookingDate.toLocaleDateString()} at {booking.start_time.slice(0,5)} - {booking.end_time.slice(0,5)}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {booking.ground_address}, {booking.ground_city}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Sport</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {booking.sport_name || 'General'}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Pricing</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex justify-between max-w-xs">
                  <span>Total:</span>
                  <span className="font-medium">₹{booking.total_price}</span>
                </div>
                <div className="flex justify-between max-w-xs mt-1">
                  <span className="text-gray-500">Advance (50%):</span>
                  <span>₹{booking.advance_amount}</span>
                </div>
                <div className="flex justify-between max-w-xs mt-1">
                  <span className="text-gray-500">Remaining:</span>
                  <span>₹{booking.remaining_amount}</span>
                </div>
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="capitalize">{booking.payment_status || 'Pending'}</span>
                {booking.payment_type && <span className="text-gray-500 ml-2">({booking.payment_type})</span>}
                <p className="mt-1 text-xs text-gray-500">Payment gateway integration coming soon.</p>
              </dd>
            </div>
            {booking.notes && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {booking.notes}
                </dd>
              </div>
            )}
            {booking.status === 'cancelled' && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-red-50">
                <dt className="text-sm font-medium text-red-800">Cancellation Info</dt>
                <dd className="mt-1 text-sm text-red-700 sm:mt-0 sm:col-span-2">
                  <p>Cancelled on: {new Date(booking.cancelled_at).toLocaleString()}</p>
                  {booking.cancellation_reason && <p>Reason: {booking.cancellation_reason}</p>}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {isCancellable && !showCancelModal && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCancelModal(true)}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50"
          >
            Cancel Booking
          </button>
        </div>
      )}

      {showCancelModal && (
        <div className="bg-white shadow sm:rounded-lg border border-red-200 overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Cancel Booking</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Are you sure you want to cancel this booking?</p>
              <ul className="list-disc pl-5 mt-2">
                <li>More than 2 hours before start: Advance is fully refundable.</li>
                <li>Within 2 hours of start: Advance is retained.</li>
              </ul>
            </div>
            <form onSubmit={handleCancel} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  placeholder="Why are you cancelling?"
                />
              </div>
              
              {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={cancelling}
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCancelModal(false); setCancelError(''); }}
                  disabled={cancelling}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Keep Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
