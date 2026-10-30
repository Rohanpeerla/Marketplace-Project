const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./config/db');
const { testEsConnection } = require('./config/elasticsearch');
const redis = require('./config/redis');

const startServer = async () => {
  try {
    const server = app.listen(config.port, () => {
      console.log('==============================================');
      console.log(`🚀 MarketHub Backend API running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`📡 Local URL:   http://localhost:${config.port}`);
      console.log(`🩺 Health check: http://localhost:${config.port}/api/health`);
      console.log('==============================================');
    });

    // Test PostgreSQL database connectivity non-blockingly
    await testConnection();

    // Test Elasticsearch connectivity non-blockingly
    await testEsConnection();

    // Connect Redis cache non-blockingly (cart falls back to PostgreSQL if unavailable)
    const redisOk = await redis.connect();
    console.log(redisOk ? '[Redis] Connected successfully' : '[Redis] Notice: unavailable, cart uses PostgreSQL only');

    // Graceful shutdown handling
    const handleShutdown = (signal) => {
      console.log(`\n[${signal}] Received. Shutting down MarketHub server gracefully...`);
      server.close(() => {
        console.log('Server closed successfully.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
