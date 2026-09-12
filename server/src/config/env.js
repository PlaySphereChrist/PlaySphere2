require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') }); // Fallback for root .env
require('dotenv').config(); // Load local .env if it exists

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'playsphere',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD,

  // Client URL for CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // JWT Secrets — must be set in .env (no insecure fallback)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,

  // Razorpay (Placeholders for future implementation)
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
};

// Validate critical variables — fail fast at startup
const jwtRequired = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of jwtRequired) {
  if (!env[key]) {
    console.error(`FATAL: Environment variable ${key} is not set. Set it in server/.env and restart.`);
    process.exit(1);
  }
}

if (env.NODE_ENV === 'production') {
  const required = ['DB_PASSWORD'];
  for (const key of required) {
    if (!env[key]) {
      console.warn(`⚠️  WARNING: ${key} is not set for production!`);
    }
  }
}

module.exports = env;
