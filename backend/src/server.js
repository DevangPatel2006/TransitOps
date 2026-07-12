require('dotenv').config();
const app = require('./app');
const prisma = require('./config/db');

require('./utils/monkeyPatch'); require('./jobs/licenseExpiryJob').start();

const PORT = process.env.PORT || 3000;
//port
const startServer = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('Successfully connected to the PostgreSQL database.');

    app.listen(PORT, () => {
      console.log(`TransitOps backend server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

//connection is proper
