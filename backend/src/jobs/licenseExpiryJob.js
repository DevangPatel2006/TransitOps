const cron = require('node-cron');
const nodemailer = require('nodemailer');
const prisma = require('../config/db');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
      user: process.env.SMTP_USER || 'smtp_user_placeholder',
      pass: process.env.SMTP_PASS || 'smtp_pass_placeholder',
    },
  });
};

const sendExpiryEmail = async (driver, daysBefore) => {
  if (process.env.NODE_ENV === 'test') {
    console.log(`[LicenseExpiryJob] (TEST MODE) Bypassing SMTP for driver: ${driver.full_name}`);
    return true;
  }

  const adminEmails = process.env.ADMIN_EMAILS || 'admin@transitops.com';
  const transporter = getTransporter();

  const mailOptions = {
    from: '"TransitOps Safety Alerts" <no-reply@transitops.com>',
    to: adminEmails,
    subject: `CRITICAL: Driver license expiring in ${daysBefore} days - ${driver.full_name}`,
    text: `Driver ${driver.full_name} (ID: ${driver.driver_id}) has a license (${driver.license_number}) expiring on ${driver.license_expiry.toISOString().split('T')[0]}.\nDays remaining: ${daysBefore}.\nPlease initiate the renewal process immediately.`,
    html: `
      <h2>Safety Alert: Expiring Driver License</h2>
      <p><strong>Driver:</strong> ${driver.full_name} (ID: ${driver.driver_id})</p>
      <p><strong>License Number:</strong> ${driver.license_number}</p>
      <p><strong>Expiry Date:</strong> ${driver.license_expiry.toISOString().split('T')[0]}</p>
      <p><strong>Days Remaining:</strong> <span style="color: red; font-weight: bold;">${daysBefore}</span></p>
      <p>This is an automated reminder. Please initiate the renewal process immediately.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[LicenseExpiryJob] Notification email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[LicenseExpiryJob] Failed to send email alert for driver ${driver.full_name}:`, error.message);
    return false;
  }
};

const checkAndSendReminders = async () => {
  console.log('[LicenseExpiryJob] Running driver license expiry check...');
  const thresholds = [30, 15, 7, 1];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const T of thresholds) {
    // Target date = today + T days
    const targetStart = new Date(today);
    targetStart.setDate(today.getDate() + T);
    const targetEnd = new Date(targetStart);
    targetEnd.setHours(23, 59, 59, 999);

    const expiringDrivers = await prisma.driver.findMany({
      where: {
        status: { not: 'SUSPENDED' },
        license_expiry: {
          gte: targetStart,
          lte: targetEnd,
        },
      },
    });

    for (const driver of expiringDrivers) {
      // Check if a reminder was already sent today for this driver & days threshold
      const logStart = new Date();
      logStart.setHours(0, 0, 0, 0);
      const logEnd = new Date();
      logEnd.setHours(23, 59, 59, 999);

      const alreadySent = await prisma.licenseReminderLog.findFirst({
        where: {
          driver_id: driver.driver_id,
          days_before: T,
          sent_at: {
            gte: logStart,
            lte: logEnd,
          },
        },
      });

      if (!alreadySent) {
        console.log(`[LicenseExpiryJob] Expiry warning triggered for ${driver.full_name} (${T} days left)`);
        
        // Log to database first to prevent double send in case email delivery hangs
        const logEntry = await prisma.licenseReminderLog.create({
          data: {
            driver_id: driver.driver_id,
            days_before: T,
          },
        });

        const success = await sendExpiryEmail(driver, T);
        
        if (!success) {
          // If email send failed completely, we can optionally delete the log entry or keep it
          // Keeping it avoids spamming retry attempts if SMTP is configured incorrectly.
          console.warn(`[LicenseExpiryJob] Warning: logged reminder despite email failure to prevent retry loops.`);
        }
      }
    }
  }
  console.log('[LicenseExpiryJob] Expiry checks complete.');
};

const start = () => {
  // Cron schedule: Daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      await checkAndSendReminders();
    } catch (error) {
      console.error('[LicenseExpiryJob] Cron execution failed:', error);
    }
  });
  console.log('[LicenseExpiryJob] Daily 8:00 AM driver license expiry cron job initialized.');
};

module.exports = {
  start,
  checkAndSendReminders, // exported for testing or manual triggers
};
//checked filee