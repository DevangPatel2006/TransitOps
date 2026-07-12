const prisma = require('../../config/db');
const { checkAndSendReminders } = require('../../jobs/licenseExpiryJob');

const getExpiringLicenses = async (days = 30) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + days);
  targetDate.setHours(23, 59, 59, 999);

  return await prisma.driver.findMany({
    where: {
      status: { not: 'SUSPENDED' },
      license_expiry: {
        gte: today,
        lte: targetDate,
      },
    },
    orderBy: {
      license_expiry: 'asc',
    },
  });
};

const triggerCheck = async () => {
  await checkAndSendReminders();
  return { message: 'License expiry check completed successfully.' };
};

module.exports = {
  getExpiringLicenses,
  triggerCheck,
};
