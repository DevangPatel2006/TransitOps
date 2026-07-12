const prisma = require('../../config/db');

const getKPIs = async (filters = {}) => {
  const { type, region } = filters;
//db
  const vehicleWhere = {};
  if (type) vehicleWhere.type = type;
  if (region) {
    vehicleWhere.region = {
      equals: region,
      mode: 'insensitive',
    };
  }

  const activeVehicles = await prisma.vehicle.count({
    where: { ...vehicleWhere, status: 'ON_TRIP' },
  });

  const availableVehicles = await prisma.vehicle.count({
    where: { ...vehicleWhere, status: 'AVAILABLE' },
  });

  const inMaintenance = await prisma.vehicle.count({
    where: { ...vehicleWhere, status: 'IN_SHOP' },
  });

  const totalNonRetired = await prisma.vehicle.count({
    where: {
      ...vehicleWhere,
      status: { not: 'RETIRED' },
    },
  });

  let fleetUtilizationPct = 0;
  if (totalNonRetired > 0) {
    fleetUtilizationPct = (activeVehicles / totalNonRetired) * 100;
  }
  fleetUtilizationPct = Math.round(fleetUtilizationPct * 100) / 100;

  const tripWhere = {};
  if (type || region) {
    tripWhere.vehicle = vehicleWhere;
  }

  const activeTrips = await prisma.trip.count({
    where: { ...tripWhere, status: 'DISPATCHED' },
  });

  const pendingTrips = await prisma.trip.count({
    where: { ...tripWhere, status: 'DRAFT' },
  });

  const driversOnDuty = await prisma.driver.count({
    where: {
      status: { in: ['AVAILABLE', 'ON_TRIP'] },
    },
  });

  return {
    activeVehicles,
    availableVehicles,
    inMaintenance,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilizationPct,
  };
};

module.exports = {
  getKPIs,
};
