const templates = {
  ground_booking_confirmation: (data) => ({
    subject: `Booking Confirmed: ${data.ground_name} - PlaySphere`,
    html: `
      <h2>Booking Confirmed!</h2>
      <p>Your ground booking has been confirmed.</p>
      <ul>
        <li><strong>Ground:</strong> ${data.ground_name}</li>
        <li><strong>Date:</strong> ${data.slot_date}</li>
        <li><strong>Time:</strong> ${data.start_time} - ${data.end_time}</li>
        <li><strong>Amount:</strong> ₹${data.total_price}</li>
        <li><strong>Payment Status:</strong> ${data.payment_status || 'Pending'}</li>
        <li><strong>Booking ID:</strong> ${data.booking_id}</li>
      </ul>
      <p>Thank you for using PlaySphere!</p>
    `
  }),

  ground_booking_cancellation: (data) => ({
    subject: `Booking Cancelled: ${data.ground_name} - PlaySphere`,
    html: `
      <h2>Booking Cancelled</h2>
      <p>Your ground booking has been cancelled.</p>
      <ul>
        <li><strong>Ground:</strong> ${data.ground_name}</li>
        <li><strong>Date:</strong> ${data.slot_date}</li>
        <li><strong>Time:</strong> ${data.start_time} - ${data.end_time}</li>
        <li><strong>Cancellation Status:</strong> ${data.status}</li>
        ${data.refund_status ? `<li><strong>Refund Status:</strong> ${data.refund_status}</li>` : ''}
        ${data.refund_amount ? `<li><strong>Refund Amount:</strong> ₹${data.refund_amount}</li>` : ''}
        <li><strong>Booking ID:</strong> ${data.booking_id}</li>
      </ul>
      <p>If you have any questions, please contact support.</p>
    `
  }),

  tournament_registration_confirmation: (data) => ({
    subject: `Tournament Registration: ${data.tournament_name} - PlaySphere`,
    html: `
      <h2>Tournament Registration Successful</h2>
      <p>You have successfully registered for the tournament.</p>
      <ul>
        <li><strong>Tournament:</strong> ${data.tournament_name}</li>
        <li><strong>Status:</strong> ${data.status}</li>
        <li><strong>Registration Fee:</strong> ${data.fee ? `₹${data.fee}` : 'Free'}</li>
        <li><strong>Registration ID:</strong> ${data.registration_id}</li>
      </ul>
      <p>Get ready to play!</p>
    `
  }),

  payment_confirmation: (data) => ({
    subject: `Payment Successful - PlaySphere`,
    html: `
      <h2>Payment Successful</h2>
      <p>Your payment has been successfully processed.</p>
      <ul>
        <li><strong>Amount:</strong> ₹${data.amount}</li>
        <li><strong>Type:</strong> ${data.entity_type}</li>
        <li><strong>Reference ID:</strong> ${data.entity_id}</li>
        <li><strong>Payment ID:</strong> ${data.payment_id}</li>
      </ul>
    `
  }),

  refund_confirmation: (data) => ({
    subject: `Refund Initiated - PlaySphere`,
    html: `
      <h2>Refund Initiated</h2>
      <p>A refund has been initiated for your recent cancellation.</p>
      <ul>
        <li><strong>Amount:</strong> ₹${data.amount}</li>
        <li><strong>Reason:</strong> ${data.reason}</li>
        <li><strong>Reference ID:</strong> ${data.entity_id}</li>
      </ul>
      <p>Refunds typically take 5-7 business days to process.</p>
    `
  })
};

module.exports = templates;
