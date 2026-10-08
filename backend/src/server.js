require('dotenv').config();
const app = require('./app');
const prisma = require('./config/db');

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 3000;

// Internal cron can be optionally enabled via environment variable (e.g. for standalone local testing).
// In production on Render, scheduled tasks should be triggered via the Render Cron Job service.
if (process.env.ENABLE_INTERNAL_CRON === 'true') {
  require('./jobs/licenseExpiryJob').start();
}

const ensureStandardRoles = async () => {
  const roleNames = ['FLEET_MANAGER', 'DRIVER_OPS', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];
  for (const name of roleNames) {
    try {
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    } catch (err) {
      console.warn(`[Bootstrap] Notice for role ${name}:`, err.message);
    }
  }
};

const startServer = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('Successfully connected to the PostgreSQL database.');
    await ensureStandardRoles();

    const server = app.listen(PORT, HOST, () => {
      console.log(`TransitOps backend server is running on http://${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database connection closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
