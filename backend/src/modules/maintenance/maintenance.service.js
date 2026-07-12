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

    if (vehicle.status === 'ON_TRIP') {
      throw new ApiError(409, 'Cannot place vehicle in maintenance while it is on a trip');
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

    await tx.vehicle.update({
      where: { vehicle_id },
      data: { status: 'IN_SHOP' },
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

    const updatedLog = await tx.maintenanceLog.update({
      where: { maintenance_id: id },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
      },
    });

    const vehicle = await tx.vehicle.findUnique({
      where: { vehicle_id: log.vehicle_id },
    });

    if (vehicle.status !== 'RETIRED') {
      await tx.vehicle.update({
        where: { vehicle_id: log.vehicle_id },
        data: { status: 'AVAILABLE' },
      });
    }

    return updatedLog;
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
