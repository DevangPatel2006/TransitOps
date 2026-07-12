const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const createFuelLog = async (data) => {
  const { vehicle_id, trip_id, liters, cost, log_date } = data;

  const vehicle = await prisma.vehicle.findUnique({ where: { vehicle_id } });
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }

  if (trip_id) {
    const trip = await prisma.trip.findUnique({ where: { trip_id } });
    if (!trip) {
      throw new ApiError(404, 'Trip not found');
    }
  }

  return await prisma.fuelLog.create({
    data: {
      vehicle_id,
      trip_id,
      liters,
      cost,
      log_date: log_date || new Date(),
    },
  });
};

const getFuelLogs = async (filters = {}) => {
  const { vehicleId } = filters;
  const where = {};
  if (vehicleId) where.vehicle_id = vehicleId;

  return await prisma.fuelLog.findMany({
    where,
    include: {
      vehicle: true,
      trip: true,
    },
  });
};

const createExpense = async (data) => {
  const { vehicle_id, type, amount, expense_date, notes } = data;

  const vehicle = await prisma.vehicle.findUnique({ where: { vehicle_id } });
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }

  return await prisma.expense.create({
    data: {
      vehicle_id,
      type,
      amount,
      expense_date: expense_date || new Date(),
      notes,
    },
  });
};

const getExpenses = async (filters = {}) => {
  const { vehicleId } = filters;
  const where = {};
  if (vehicleId) where.vehicle_id = vehicleId;

  return await prisma.expense.findMany({
    where,
    include: {
      vehicle: true,
    },
  });
};

module.exports = {
  createFuelLog,
  getFuelLogs,
  createExpense,
  getExpenses,
};
