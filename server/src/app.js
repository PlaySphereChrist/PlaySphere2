const express = require('express');
const cors = require('cors');
const env = require('./config/env');

// Middleware imports
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const apiRoutes = require('./routes/index');

const app = express();

// Global Middleware
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));

// ---------------------------------------------------------------------------
// Raw body capture for Razorpay webhook signature verification.
// For the webhook route we collect raw Buffer chunks (NOT req.setEncoding —
// that conflicts with body-parser's raw-body module). For all other routes
// we pass through to express.json() normally.
// ---------------------------------------------------------------------------
const WEBHOOK_PATH = '/api/payments/razorpay/webhook';

app.use((req, res, next) => {
  if (req.path !== WEBHOOK_PATH) { return next(); }

  // Collect raw bytes without setEncoding
  const chunks = [];
  req.on('data', (chunk) => { chunks.push(chunk); });
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    req.rawBody = raw;
    try { req.body = JSON.parse(raw); } catch { req.body = {}; }
    next();
  });
});

// Normal JSON/urlencoded parsing for all non-webhook routes
app.use((req, res, next) => {
  if (req.path === WEBHOOK_PATH) { return next(); }
  express.json()(req, res, next);
});
app.use((req, res, next) => {
  if (req.path === WEBHOOK_PATH) { return next(); }
  express.urlencoded({ extended: true })(req, res, next);
});
app.use(requestLogger);

// API Routes
app.use('/api', apiRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
