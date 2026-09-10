const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, query } = require('../../config/database');
const env = require('../../config/env');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  // jti ensures each refresh token is unique even when issued within the same second
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh', jti: crypto.randomBytes(16).toString('hex') },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const registerUser = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Check if user exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existingUser.rows.length > 0) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert user
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) RETURNING id, email, is_active, is_email_verified, created_at`,
      [normalizedEmail, passwordHash]
    );
    const user = userRes.rows[0];

    // Assign USER role
    const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['USER']);
    if (roleRes.rows.length === 0) {
      throw new Error('Default USER role not found in database');
    }
    const roleId = roleRes.rows[0].id;

    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [user.id, roleId]
    );

    await client.query('COMMIT');
    
    user.roles = ['USER'];
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const loginUser = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Find user
  const userRes = await query(
    `SELECT id, email, password_hash, is_active, is_email_verified 
     FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  if (userRes.rows.length === 0) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const user = userRes.rows[0];

  if (!user.is_active) {
    const err = new Error('Account is inactive');
    err.statusCode = 401;
    throw err;
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  // Load roles
  const rolesRes = await query(
    `SELECT r.name FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [user.id]
  );
  
  const roles = rolesRes.rows.map(r => r.name);
  const safeUser = {
    id: user.id,
    email: user.email,
    is_active: user.is_active,
    is_email_verified: user.is_email_verified,
    roles
  };

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(safeUser);
  const tokenHash = hashToken(refreshToken);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update last login
    await client.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    
    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { user: safeUser, accessToken, refreshToken };
};

const refreshTokens = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const tokenHash = hashToken(refreshToken);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find token in db and row-lock
    const tokenRes = await client.query(
      `SELECT id, user_id, revoked_at, expires_at 
       FROM refresh_tokens 
       WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      const err = new Error('Refresh token not found');
      err.statusCode = 401;
      throw err;
    }

    const dbToken = tokenRes.rows[0];

    if (dbToken.revoked_at !== null || new Date(dbToken.expires_at) < new Date()) {
      const err = new Error('Refresh token is invalid or expired');
      err.statusCode = 401;
      throw err;
    }

    // Load user & roles
    const userRes = await client.query(
      `SELECT id, email, is_active, is_email_verified 
       FROM users WHERE id = $1`,
      [dbToken.user_id]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      const err = new Error('User inactive or not found');
      err.statusCode = 401;
      throw err;
    }

    const user = userRes.rows[0];

    const rolesRes = await client.query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );
    user.roles = rolesRes.rows.map(r => r.name);

    // Rotate: Revoke old token
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [dbToken.id]
    );

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    const newTokenHash = hashToken(newRefreshToken);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store new token
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, newTokenHash, expiresAt]
    );

    await client.query('COMMIT');
    
    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const logoutUser = async (refreshToken) => {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() 
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
};

module.exports = {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser
};
