const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/markethub_db',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  elasticsearchIndex: process.env.ELASTICSEARCH_INDEX || 'products',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cartCacheTtlSeconds: parseInt(process.env.CART_CACHE_TTL_SECONDS, 10) || 1800,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder',
  razorpayCurrency: process.env.RAZORPAY_CURRENCY || 'INR',
};

module.exports = config;
