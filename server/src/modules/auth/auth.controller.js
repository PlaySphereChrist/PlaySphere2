const authService = require('./auth.service');

const register = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const err = new Error('Invalid email format');
    err.statusCode = 400;
    throw err;
  }
  
  if (password.length < 8) {
    const err = new Error('Password must be at least 8 characters long');
    err.statusCode = 400;
    throw err;
  }

  const user = await authService.registerUser(email, password);
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user }
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const { user, accessToken, refreshToken } = await authService.loginUser(email, password);
  
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken, refreshToken }
  });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    const err = new Error('Refresh token is required');
    err.statusCode = 400;
    throw err;
  }

  const tokens = await authService.refreshTokens(refreshToken);
  
  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: tokens
  });
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    await authService.logoutUser(refreshToken);
  }
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

const getMe = async (req, res) => {
  // req.user is populated by the authenticate middleware
  res.status(200).json({
    success: true,
    message: 'Authenticated user profile retrieved',
    data: { user: req.user }
  });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe
};
