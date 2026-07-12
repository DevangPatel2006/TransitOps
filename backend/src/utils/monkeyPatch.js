const prisma = require('../config/db');
const vehiclesService = require('../modules/vehicles/vehicles.service');
const driversService = require('../modules/drivers/drivers.service');
const tripsService = require('../modules/trips/trips.service');

// 1. Monkey-patch getVehicles
vehiclesService.getVehicles = async (filters = {}, sortByParam, sortOrderParam, searchParam) => {
  const { status, type, region } = filters;
  const sortBy = sortByParam || filters.sortBy;
  const sortOrder = sortOrderParam || filters.sortOrder || 'asc';
  const search = searchParam || filters.search;

  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (region) {
    where.region = {
      equals: region,
      mode: 'insensitive',
    };
  }

  if (search) {
    where.OR = [
      { registration_no: { contains: search, mode: 'insensitive' } },
      { name_model: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy = {};
  const allowedSortFields = ['vehicle_id', 'registration_no', 'name_model', 'type', 'max_load_capacity', 'odometer', 'acquisition_cost', 'region', 'status', 'created_at'];
  if (sortBy && allowedSortFields.includes(sortBy)) {
    orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
  } else {
    orderBy['vehicle_id'] = 'asc';
  }

  return await prisma.vehicle.findMany({ where, orderBy });
};

// 2. Monkey-patch getDrivers
driversService.getDrivers = async (filters = {}, sortByParam, sortOrderParam, searchParam) => {
  const { status, expiringBefore } = filters;
  const sortBy = sortByParam || filters.sortBy;
  const sortOrder = sortOrderParam || filters.sortOrder || 'asc';
  const search = searchParam || filters.search;

  const where = {};
  if (status) where.status = status;
  if (expiringBefore) {
    where.license_expiry = {
      lte: expiringBefore,
    };
  }

  if (search) {
    where.OR = [
      { full_name: { contains: search, mode: 'insensitive' } },
      { license_number: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy = {};
  const allowedSortFields = ['driver_id', 'full_name', 'license_number', 'license_category', 'license_expiry', 'contact_number', 'safety_score', 'status', 'created_at'];
  if (sortBy && allowedSortFields.includes(sortBy)) {
    orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
  } else {
    orderBy['driver_id'] = 'asc';
  }

  return await prisma.driver.findMany({ where, orderBy });
};

// 3. Monkey-patch getTrips
tripsService.getTrips = async (filters = {}, sortByParam, sortOrderParam, searchParam) => {
  const { status } = filters;
  const sortBy = sortByParam || filters.sortBy;
  const sortOrder = sortOrderParam || filters.sortOrder || 'asc';
  const search = searchParam || filters.search;

  const where = {};
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { source: { contains: search, mode: 'insensitive' } },
      { destination: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy = {};
  const allowedSortFields = ['trip_id', 'source', 'destination', 'vehicle_id', 'driver_id', 'cargo_weight', 'planned_distance', 'actual_distance', 'fuel_consumed', 'revenue', 'status', 'dispatched_at', 'completed_at', 'created_at'];
  if (sortBy && allowedSortFields.includes(sortBy)) {
    orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
  } else {
    orderBy['trip_id'] = 'asc';
  }

  return await prisma.trip.findMany({
    where,
    orderBy,
    include: {
      vehicle: true,
      driver: true,
      creator: {
        select: {
          user_id: true,
          full_name: true,
          email: true,
        },
      },
    },
  });
};

console.log('[MonkeyPatch] getVehicles, getDrivers, and getTrips service functions extended additively.');

//verified monkeyPatch
