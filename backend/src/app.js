const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const ApiError = require('./utils/ApiError');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./modules/auth/auth.routes');
const vehiclesRoutes = require('./modules/vehicles/vehicles.routes');
const driversRoutes = require('./modules/drivers/drivers.routes');
const tripsRoutes = require('./modules/trips/trips.routes');
const maintenanceRoutes = require('./modules/maintenance/maintenance.routes');
const fuelExpensesRoutes = require('./modules/fuel-expenses/fuel-expenses.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const reportsPdfRoutes = require('./modules/reports/reports.pdf.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const vehicleDocumentsRoutes = require('./modules/vehicle-documents/vehicle-documents.routes');

require('./utils/monkeyPatch');
const prisma = require('./config/db');

const app = express();

// Security HTTP headers
app.use(helmet());

// Production-safe CORS supporting multiple origins
const rawFrontendUrls = process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000';
const allowedOrigins = rawFrontendUrls
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (like health checks, server-to-server, curl)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed === normalizedOrigin) return true;
      // Support subdomain wildcard patterns e.g. *.vercel.app if configured
      if (allowed.startsWith('*.') && normalizedOrigin.endsWith(allowed.slice(1))) return true;
      return false;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`CORS error: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Unauthenticated health check endpoint for Render and uptime monitoring
app.get('/health', async (req, res) => {
  try {
    // Quick, lightweight database connectivity verification
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      service: 'transitops-backend',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      service: 'transitops-backend',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// Parse json request body
app.use(express.json());

// API Routes mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vehicles', vehiclesRoutes);
app.use('/api/v1/drivers', driversRoutes);
app.use('/api/v1/trips', tripsRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports/export/pdf', reportsPdfRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1', vehicleDocumentsRoutes);

// Mounting fuel and expenses router directly to api/v1 because it serves /fuel-logs and /expenses
app.use('/api/v1', fuelExpensesRoutes);

// Send back 404 for any unknown api requests
app.use((req, res, next) => {
  next(new ApiError(404, 'Route not found'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
//routes

//working checked