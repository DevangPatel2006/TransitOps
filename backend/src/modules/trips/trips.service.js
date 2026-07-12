const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const createTrip = async (data, userId) => {
  const { vehicle_id, driver_id, cargo_weight, planned_distance, source, destination } = data;

  // 1. Fetch and validate Vehicle
  const vehicle = await prisma.vehicle.findUnique({ where: { vehicle_id } });
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }
  if (vehicle.status === 'RETIRED' || vehicle.status === 'IN_SHOP') {
    throw new ApiError(409, `Vehicle is not available (status: ${vehicle.status})`);
  }
  if (vehicle.status === 'ON_TRIP') {
    throw new ApiError(409, 'Vehicle is already assigned to an active trip');
  }

  // 2. Fetch and validate Driver
  const driver = await prisma.driver.findUnique({ where: { driver_id } });
  if (!driver) {
    throw new ApiError(404, 'Driver not found');
  }
  if (driver.status === 'SUSPENDED') {
    throw new ApiError(409, 'Driver is suspended');
  }
  
  // Date check
  const currentDate = new Date();
  // Strip time for exact date comparison if needed, but license_expiry < currentDate is standard.
  const expiryDate = new Date(driver.license_expiry);
  if (expiryDate < currentDate) {
    throw new ApiError(409, 'Driver license is expired');
  }

  if (driver.status === 'ON_TRIP') {
    throw new ApiError(409, 'Driver is already assigned to an active trip');
  }

  // 3. Cargo capacity check
  // Convert Decimals to Number for comparison
  const capacity = Number(vehicle.max_load_capacity);
  if (cargo_weight > capacity) {
    throw new ApiError(422, `Cargo weight exceeds vehicle's maximum load capacity of ${capacity} kg`);
  }

  // 4. Create Draft Trip
  return await prisma.trip.create({
    data: {
      source,
      destination,
      vehicle_id,
      driver_id,
      cargo_weight,
      planned_distance,
      status: 'DRAFT',
      created_by: userId,
    },
  });
};

const getTrips = async (filters = {}) => {
  const { status } = filters;
  const where = {};
  if (status) where.status = status;

  return await prisma.trip.findMany({
    where,
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

const getTripById = async (id) => {
  const trip = await prisma.trip.findUnique({
    where: { trip_id: id },
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
  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }
  return trip;
};

const dispatchTrip = async (id) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch trip and lock (Prisma doesn't have direct SELECT FOR UPDATE in clean DSL,
    // but running queries inside transaction provides read consistency, and we can check status)
    const trip = await tx.trip.findUnique({
      where: { trip_id: id },
    });

    if (!trip) {
      throw new ApiError(404, 'Trip not found');
    }

    if (trip.status !== 'DRAFT') {
      throw new ApiError(400, `Cannot dispatch a trip in ${trip.status} status`);
    }

    // 2. Fetch and re-validate vehicle availability inside the transaction
    const vehicle = await tx.vehicle.findUnique({
      where: { vehicle_id: trip.vehicle_id },
    });

    if (vehicle.status !== 'AVAILABLE') {
      throw new ApiError(409, `Vehicle is not available for dispatch (status: ${vehicle.status})`);
    }

    // 3. Fetch and re-validate driver availability inside the transaction
    const driver = await tx.driver.findUnique({
      where: { driver_id: trip.driver_id },
    });

    if (driver.status !== 'AVAILABLE') {
      throw new ApiError(409, `Driver is not available for dispatch (status: ${driver.status})`);
    }

    if (new Date(driver.license_expiry) < new Date()) {
      throw new ApiError(409, 'Driver license is expired');
    }

    // 4. Atomically update statuses
    const updatedTrip = await tx.trip.update({
      where: { trip_id: id },
      data: {
        status: 'DISPATCHED',
        dispatched_at: new Date(),
      },
    });

    await tx.vehicle.update({
      where: { vehicle_id: trip.vehicle_id },
      data: { status: 'ON_TRIP' },
    });

    await tx.driver.update({
      where: { driver_id: trip.driver_id },
      data: { status: 'ON_TRIP' },
    });

    return updatedTrip;
  });
};

const completeTrip = async (id, completionData) => {
  const { final_odometer, fuel_consumed, revenue } = completionData;

  return await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { trip_id: id },
    });

    if (!trip) {
      throw new ApiError(404, 'Trip not found');
    }

    if (trip.status !== 'DISPATCHED') {
      throw new ApiError(400, `Cannot complete a trip in ${trip.status} status`);
    }

    const vehicle = await tx.vehicle.findUnique({
      where: { vehicle_id: trip.vehicle_id },
    });

    const currentOdo = Number(vehicle.odometer);
    if (final_odometer < currentOdo) {
      throw new ApiError(400, `Final odometer (${final_odometer}) cannot be less than vehicle starting odometer (${currentOdo})`);
    }

    const actual_distance = final_odometer - currentOdo;

    // Update trip details
    const updatedTrip = await tx.trip.update({
      where: { trip_id: id },
      data: {
        status: 'COMPLETED',
        actual_distance,
        fuel_consumed,
        revenue,
        completed_at: new Date(),
      },
    });

    // Restore vehicle and driver availability
    await tx.vehicle.update({
      where: { vehicle_id: trip.vehicle_id },
      data: {
        status: 'AVAILABLE',
        odometer: final_odometer,
      },
    });

    await tx.driver.update({
      where: { driver_id: trip.driver_id },
      data: {
        status: 'AVAILABLE',
      },
    });

    return updatedTrip;
  });
};

const cancelTrip = async (id) => {
  return await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { trip_id: id },
    });

    if (!trip) {
      throw new ApiError(404, 'Trip not found');
    }

    if (trip.status === 'CANCELLED' || trip.status === 'COMPLETED') {
      throw new ApiError(400, `Cannot cancel a trip in ${trip.status} status`);
    }

    const updatedTrip = await tx.trip.update({
      where: { trip_id: id },
      data: { status: 'CANCELLED' },
    });

    // If it was already dispatched, restore vehicle and driver availability
    if (trip.status === 'DISPATCHED') {
      await tx.vehicle.update({
        where: { vehicle_id: trip.vehicle_id },
        data: { status: 'AVAILABLE' },
      });

      await tx.driver.update({
        where: { driver_id: trip.driver_id },
        data: { status: 'AVAILABLE' },
      });
    }

    return updatedTrip;
  });
};

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  dispatchTrip,
  completeTrip,
  cancelTrip,
};
