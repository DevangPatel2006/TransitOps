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

const app = express();

// Security HTTP headers
app.use(helmet());

// Enable CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

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

// Mounting fuel and expenses router directly to api/v1 because it serves /fuel-logs and /expenses
app.use('/api/v1', fuelExpensesRoutes);

// Send back 404 for any unknown api requests
app.use((req, res, next) => {
  next(new ApiError(404, 'Route not found'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
