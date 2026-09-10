const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.name}: ${err.message}`);
  
  // Do not expose stack traces in production
  const stack = env.NODE_ENV === 'development' ? err.stack : undefined;
  
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(stack && { stack })
  });
};

module.exports = errorHandler;
