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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Routes
app.use('/api', apiRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
