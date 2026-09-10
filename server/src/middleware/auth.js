const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/database');

/**
 * Middleware to authenticate a user using a JWT access token.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (decoded.type !== 'access') {
      const err = new Error('Invalid token type');
      err.statusCode = 401;
      throw err;
    }

    // Load user and roles from database
    const userResult = await query(
      `SELECT id, email, is_active, is_email_verified 
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      const err = new Error('User not found');
      err.statusCode = 401;
      throw err;
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      const err = new Error('Account is inactive');
      err.statusCode = 401;
      throw err;
    }

    // Load roles
    const rolesResult = await query(
      `SELECT r.name 
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );
    
    user.roles = rolesResult.rows.map(row => row.name);

    // Attach to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      error.statusCode = 401;
      error.message = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      error.statusCode = 401;
      error.message = 'Invalid token';
    }
    next(error);
  }
};

/**
 * Middleware to authorize specific roles.
 * Must be used AFTER authenticate middleware.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      const err = new Error('Not authenticated');
      err.statusCode = 401;
      return next(err);
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      const err = new Error('Insufficient permissions');
      err.statusCode = 403;
      return next(err);
    }
    
    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles
};
