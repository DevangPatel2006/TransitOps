require('dotenv').config();
const prisma = require('../config/db');
const { checkAndSendReminders } = require('./licenseExpiryJob');

async function run() {
  console.log('====================================================');
  console.log('[LicenseExpiryRunner] Standalone Expiry Check Started');
  console.log(`[LicenseExpiryRunner] Time: ${new Date().toISOString()}`);
  console.log('====================================================');

  try {
    await prisma.$connect();
    console.log('[LicenseExpiryRunner] Connected to database.');

    await checkAndSendReminders();

    console.log('[LicenseExpiryRunner] Job executed successfully.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[LicenseExpiryRunner] Job failed with error:', error);
    try {
      await prisma.$disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

run();
