import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  PsButton,
  PsCard,
  PsBadge,
  PsAlert,
  PsInput,
  PsPageHeader,
  PsLoading,
  PsBackButton
} from '../components/ui';

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

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState('');

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
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPaymentError('Failed to load payment gateway. Please check your internet connection and try again.');
        setPaymentLoading(false);
        return;
      }

      let orderData;
      try {
        const orderRes = await api.post(`/ground-bookings/${bookingId}/payment/order`, {});
        orderData = orderRes.data;
      } catch (err) {
        setPaymentError(err.message || 'Failed to create payment order');
        setPaymentLoading(false);
        return;
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'PlaySphere',
        description: `Ground Booking Advance Payment`,
        prefill: {
          email: booking?.booked_by_user_email || '',
        },
        theme: { color: '#6E1423' },
        handler: async function (response) {
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

  if (loading) return <PsLoading />;
  
  if (error && !booking) {
    return (
      <div className="space-y-4">
        <PsBackButton to="/bookings" label="Back to Bookings" />
        <PsAlert variant="error">{error}</PsAlert>
      </div>
    );
  }

  if (!booking) return null;

  let dStr = booking.slot_date;
  if (dStr && dStr.includes('T')) dStr = dStr.split('T')[0];
  const bookingDate = new Date(dStr);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      case 'completed': return 'default';
      default: return 'default';
    }
  };

  const getPaymentStatusVariant = (status) => {
    switch (status) {
      case 'captured': return 'success';
      case 'failed': return 'danger';
      case 'refunded': return 'default';
      case 'authorized': return 'default';
      default: return 'warning';
    }
  };

  const isCancellable = ['pending', 'confirmed'].includes(booking.status);
  const isPending = booking.status === 'pending';
  const paymentCaptured = booking.payment_status === 'captured';
  const paymentRefunded = booking.payment_status === 'refunded';

  const canPay = isPending && !paymentCaptured && booking.status !== 'cancelled';
  const canRequestRefund = booking.status === 'cancelled' && paymentCaptured && !paymentRefunded;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <PsBackButton to="/bookings" label="Back to Bookings" />
      <PsPageHeader title="Booking Details" />

      {cancelResult && <PsAlert variant="success">{cancelResult}</PsAlert>}
      {paymentSuccess && (
        <PsAlert variant="success">
          ✓ Payment verified successfully. Your booking is now confirmed.
        </PsAlert>
      )}
      {refundSuccess && <PsAlert variant="success">{refundSuccess}</PsAlert>}

      <PsCard>
        <div className="px-6 py-5 flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border bg-pill-hover rounded-t-2xl">
          <div>
            <h3 className="text-xl font-serif font-bold text-primary">
              {booking.ground_name}
            </h3>
            <p className="mt-1 text-sm text-secondary">
              Booking ID: {booking.id}
            </p>
          </div>
          <PsBadge variant={getStatusVariant(booking.status)}>
            {booking.status.toUpperCase()}
          </PsBadge>
        </div>
        
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-secondary">Date &amp; Time</p>
            <p className="mt-1 text-sm text-primary">
              {bookingDate.toLocaleDateString()} at {booking.start_time?.slice(0,5)} - {booking.end_time?.slice(0,5)}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-secondary">Location</p>
            <p className="mt-1 text-sm text-primary">
              {booking.ground_address}, {booking.ground_city}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-secondary">Sport</p>
            <p className="mt-1 text-sm text-primary">
              {booking.sport_name || 'General'}
            </p>
          </div>
          
          <div className="bg-surface border border-border p-3 rounded-xl sm:col-span-2 sm:max-w-md">
            <p className="text-sm font-medium text-secondary mb-2 border-b border-border pb-1">Pricing</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary">Total:</span>
                <span className="font-bold text-primary">₹{booking.total_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Advance (50%):</span>
                <span className="font-medium text-primary">₹{booking.advance_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Remaining:</span>
                <span className="font-medium text-primary">₹{booking.remaining_amount}</span>
              </div>
            </div>
          </div>
          
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-secondary">Payment Status</p>
            <div className="mt-2 flex items-center gap-2">
              <PsBadge variant={getPaymentStatusVariant(booking.payment_status)} className="capitalize">
                {booking.payment_status || 'created'}
              </PsBadge>
              {booking.payment_type && (
                <span className="text-secondary text-xs">({booking.payment_type})</span>
              )}
            </div>
            {booking.advance_paid_at && (
              <p className="mt-2 text-xs text-secondary">
                Paid on: {new Date(booking.advance_paid_at).toLocaleString()}
              </p>
            )}
          </div>
          
          {booking.notes && (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-secondary">Notes</p>
              <p className="mt-1 text-sm text-primary bg-pill p-3 rounded-lg">
                {booking.notes}
              </p>
            </div>
          )}
          
          {booking.status === 'cancelled' && (
            <div className="sm:col-span-2 bg-error/5 border border-error/20 p-4 rounded-xl">
              <p className="text-sm font-bold text-error">Cancellation Info</p>
              <div className="mt-1 text-sm text-error/80">
                {booking.cancelled_at && <p>Cancelled on: {new Date(booking.cancelled_at).toLocaleString()}</p>}
                {booking.cancellation_reason && <p>Reason: {booking.cancellation_reason}</p>}
              </div>
            </div>
          )}
        </div>
      </PsCard>

      {/* === PAYMENT SECTION === */}
      {canPay && (
        <PsCard className="p-6 border-maroon/20 bg-maroon/5">
          <h3 className="text-lg font-serif font-bold text-primary">Pay Advance</h3>
          <p className="mt-1 text-sm text-secondary">
            Pay ₹{booking.advance_amount} now to confirm your booking. The remaining ₹{booking.remaining_amount} is due at the venue.
          </p>
          {paymentError && <PsAlert variant="error" className="mt-4">{paymentError}</PsAlert>}
          
          <div className="mt-5">
            <PsButton
              onClick={handlePayNow}
              disabled={paymentLoading}
              className="w-full sm:w-auto"
            >
              {paymentLoading ? 'Processing...' : `Pay ₹${booking.advance_amount} via Razorpay`}
            </PsButton>
          </div>
          <p className="mt-3 text-xs text-muted">Powered by Razorpay Test Mode. No real money is charged.</p>
        </PsCard>
      )}

      {/* === REFUND SECTION === */}
      {canRequestRefund && (
        <PsCard className="p-6 border-gold/40 bg-gold/5">
          <h3 className="text-lg font-serif font-bold text-primary">Advance Refund</h3>
          <p className="mt-1 text-sm text-secondary">
            Your booking was cancelled more than 2 hours before the slot. Your advance payment of ₹{booking.advance_amount} is eligible for a refund.
          </p>
          {refundError && <PsAlert variant="error" className="mt-4">{refundError}</PsAlert>}
          <div className="mt-5">
            <PsButton
              onClick={handleProcessRefund}
              disabled={refundLoading}
              style={{ backgroundColor: '#D97706', color: 'white' }}
            >
              {refundLoading ? 'Processing Refund...' : 'Process Refund'}
            </PsButton>
          </div>
        </PsCard>
      )}

      {/* === CANCELLATION SECTION === */}
      {isCancellable && !showCancelModal && (
        <div className="flex justify-end pt-4">
          <PsButton
            variant="danger"
            onClick={() => setShowCancelModal(true)}
            className="bg-transparent text-error hover:bg-error/10 border border-error/50"
          >
            Cancel Booking
          </PsButton>
        </div>
      )}

      {showCancelModal && (
        <PsCard className="p-6 border-error/50">
          <h3 className="text-lg font-serif font-bold text-error">Cancel Booking</h3>
          <div className="mt-2 text-sm text-secondary">
            <p>Are you sure you want to cancel this booking?</p>
            <ul className="list-disc pl-5 mt-2 text-muted">
              <li>More than 2 hours before start: Advance is fully refundable.</li>
              <li>Within 2 hours of start: Advance is retained.</li>
            </ul>
          </div>
          <form onSubmit={handleCancel} className="mt-5 space-y-4">
            <PsInput
              label="Reason (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why are you cancelling?"
            />
            
            {cancelError && <PsAlert variant="error">{cancelError}</PsAlert>}
            
            <div className="flex gap-3 pt-2">
              <PsButton
                variant="danger"
                type="submit"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </PsButton>
              <PsButton
                variant="ghost"
                type="button"
                onClick={() => { setShowCancelModal(false); setCancelError(''); }}
                disabled={cancelling}
              >
                Keep Booking
              </PsButton>
            </div>
          </form>
        </PsCard>
      )}
    </div>
  );
}
