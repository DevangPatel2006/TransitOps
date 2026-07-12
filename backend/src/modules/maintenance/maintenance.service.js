const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const createMaintenance = async (data) => {
  const { vehicle_id, description, cost } = data;

  return await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({
      where: { vehicle_id },
    });

    if (!vehicle) {
      throw new ApiError(404, 'Vehicle not found');
    }

    const vehicleUpdate = await tx.vehicle.updateMany({
      where: {
        vehicle_id,
        status: { notIn: ['ON_TRIP', 'RETIRED'] },
      },
      data: { status: 'IN_SHOP' },
    });
    if (vehicleUpdate.count === 0) {
      throw new ApiError(409, 'Vehicle cannot be placed in maintenance in its current state');
    }

    const log = await tx.maintenanceLog.create({
      data: {
        vehicle_id,
        description,
        cost: cost || 0,
        status: 'OPEN',
        opened_at: new Date(),
      },
    });

    return log;
  });
};

const closeMaintenance = async (id) => {
  return await prisma.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.findUnique({
      where: { maintenance_id: id },
    });

    if (!log) {
      throw new ApiError(404, 'Maintenance log not found');
    }

    if (log.status === 'CLOSED') {
      throw new ApiError(400, 'Maintenance log is already closed');
    }

    const logUpdate = await tx.maintenanceLog.updateMany({
      where: { maintenance_id: id, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
      },
    });
    if (logUpdate.count === 0) {
      throw new ApiError(409, 'Maintenance log is no longer open');
    }

    const vehicle = await tx.vehicle.findUnique({
      where: { vehicle_id: log.vehicle_id },
    });

    if (vehicle.status !== 'RETIRED') {
      await tx.vehicle.updateMany({
        where: { vehicle_id: log.vehicle_id, status: 'IN_SHOP' },
        data: { status: 'AVAILABLE' },
      });
    }

    return await tx.maintenanceLog.findUnique({
      where: { maintenance_id: id },
      include: { vehicle: true },
    });
  });
};

const getMaintenanceLogs = async (filters = {}) => {
  const { vehicleId, status } = filters;
  const where = {};
  if (vehicleId) where.vehicle_id = vehicleId;
  if (status) where.status = status;

  return await prisma.maintenanceLog.findMany({
    where,
    include: {
      vehicle: true,
    },
  });
};

module.exports = {
  createMaintenance,
  closeMaintenance,
  getMaintenanceLogs,
};
