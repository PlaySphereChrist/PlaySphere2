import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Spinner from '../components/Spinner';

/**
 * Dynamically loads the Razorpay Checkout script.
 * Returns a promise that resolves true when ready, false on failure.
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingDetailsPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Refund state
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState('');

  // Cancellation state
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelResult, setCancelResult] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/ground-bookings/${bookingId}`);
      setBooking(res.data.booking);
    } catch (err) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

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

  const handlePayNow = async () => {
    setPaymentLoading(true);
    setPaymentError('');

    try {
      // 1. Load Razorpay Checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPaymentError('Failed to load payment gateway. Please check your internet connection and try again.');
        setPaymentLoading(false);
        return;
      }

      // 2. Request a Razorpay Order from our server
      let orderData;
      try {
        const orderRes = await api.post(`/ground-bookings/${bookingId}/payment/order`, {});
        orderData = orderRes.data;
      } catch (err) {
        setPaymentError(err.message || 'Failed to create payment order');
        setPaymentLoading(false);
        return;
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,           // in paise — from server
        currency: orderData.currency,
        order_id: orderData.order_id,       // server-generated order ID
        name: 'PlaySphere',
        description: `Ground Booking Advance Payment`,
        prefill: {
          email: booking?.booked_by_user_email || '',
        },
        theme: { color: '#4F46E5' },

        handler: async function (response) {
          // 4. Checkout succeeded — send server verification request
          try {
            await api.post(`/ground-bookings/${bookingId}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentSuccess(true);
            fetchBooking();
          } catch (err) {
            setPaymentError(
              err.message || 'Payment verification failed. Contact support if amount was deducted.'
            );
          } finally {
            setPaymentLoading(false);
          }
        },

        modal: {
          ondismiss: function () {
            // User closed Checkout without completing payment — not an error
            setPaymentLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setPaymentError(
          `Payment failed: ${response.error?.description || 'Unknown error'}. Please try again.`
        );
        setPaymentLoading(false);
      });
      rzp.open();

    } catch (err) {
      setPaymentError(err.message || 'Unexpected payment error');
      setPaymentLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    setRefundLoading(true);
    setRefundError('');
    setRefundSuccess('');
    try {
      const res = await api.post(`/ground-bookings/${bookingId}/payment/refund`, {});
      setRefundSuccess(res.message || 'Refund processed successfully.');
      fetchBooking();
    } catch (err) {
      setRefundError(err.message || 'Refund processing failed');
    } finally {
      setRefundLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;
  if (!booking) return <div className="text-gray-500 py-12 text-center">Booking not found.</div>;

  let dStr = booking.slot_date;
  if (dStr && dStr.includes('T')) dStr = dStr.split('T')[0];
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

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'captured': return 'text-green-700 bg-green-50';
      case 'failed': return 'text-red-700 bg-red-50';
      case 'refunded': return 'text-blue-700 bg-blue-50';
      case 'authorized': return 'text-indigo-700 bg-indigo-50';
      default: return 'text-yellow-700 bg-yellow-50';
    }
  };

  const isCancellable = ['pending', 'confirmed'].includes(booking.status);
  const isPending = booking.status === 'pending';
  const paymentCaptured = booking.payment_status === 'captured';
  const paymentRefunded = booking.payment_status === 'refunded';

  // Show Pay button only if booking is pending and payment is not yet captured
  const canPay = isPending && !paymentCaptured && booking.status !== 'cancelled';

  // Show refund button if booking is cancelled and payment was captured and not yet refunded
  const canRequestRefund = booking.status === 'cancelled' && paymentCaptured && !paymentRefunded;

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
      {paymentSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm font-medium text-green-800">
            ✓ Payment verified successfully. Your booking is now confirmed.
          </div>
        </div>
      )}
      {refundSuccess && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="text-sm font-medium text-blue-800">{refundSuccess}</div>
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
              <dt className="text-sm font-medium text-gray-500">Date &amp; Time</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {bookingDate.toLocaleDateString()} at {booking.start_time?.slice(0,5)} - {booking.end_time?.slice(0,5)}
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
              <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getPaymentStatusColor(booking.payment_status)}`}>
                  {booking.payment_status || 'created'}
                </span>
                {booking.payment_type && (
                  <span className="text-gray-500 ml-2 text-xs">({booking.payment_type})</span>
                )}
                {booking.advance_paid_at && (
                  <p className="mt-1 text-xs text-gray-500">
                    Paid on: {new Date(booking.advance_paid_at).toLocaleString()}
                  </p>
                )}
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
                  {booking.cancelled_at && <p>Cancelled on: {new Date(booking.cancelled_at).toLocaleString()}</p>}
                  {booking.cancellation_reason && <p>Reason: {booking.cancellation_reason}</p>}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* === PAYMENT SECTION === */}
      {canPay && (
        <div className="bg-white shadow sm:rounded-lg border border-indigo-100">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Pay Advance</h3>
            <p className="mt-1 text-sm text-gray-500">
              Pay ₹{booking.advance_amount} now to confirm your booking. The remaining ₹{booking.remaining_amount} is due at the venue.
            </p>
            {paymentError && (
              <div className="mt-3 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{paymentError}</p>
              </div>
            )}
            <div className="mt-4">
              <button
                onClick={handlePayNow}
                disabled={paymentLoading}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              >
                {paymentLoading ? (
                  <><span className="mr-2">Processing...</span><Spinner /></>
                ) : (
                  `Pay ₹${booking.advance_amount} via Razorpay`
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">Powered by Razorpay Test Mode. No real money is charged.</p>
          </div>
        </div>
      )}

      {/* === REFUND SECTION === */}
      {canRequestRefund && (
        <div className="bg-white shadow sm:rounded-lg border border-blue-100">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Advance Refund</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your booking was cancelled more than 2 hours before the slot. Your advance payment of ₹{booking.advance_amount} is eligible for a refund.
            </p>
            {refundError && (
              <div className="mt-3 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{refundError}</p>
              </div>
            )}
            <div className="mt-4">
              <button
                onClick={handleProcessRefund}
                disabled={refundLoading}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {refundLoading ? 'Processing Refund...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === CANCELLATION SECTION === */}
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
