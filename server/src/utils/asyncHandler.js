/**
 * Wraps async route handlers to pass errors to the centralized error handler
 * without needing try/catch blocks in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
