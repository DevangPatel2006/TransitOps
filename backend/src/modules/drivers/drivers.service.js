const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const getDrivers = async (filters = {}) => {
  const { status, expiringBefore } = filters;

  const where = {};
  if (status) where.status = status;
  if (expiringBefore) {
    where.license_expiry = {
      lte: expiringBefore,
    };
  }

  return await prisma.driver.findMany({ where });
};

const createDriver = async (data) => {
  const { license_number } = data;

  const existing = await prisma.driver.findUnique({
    where: { license_number },
  });
  if (existing) {
    throw new ApiError(409, 'Driver with this license number already exists');
  }

  return await prisma.driver.create({ data });
};

const getDriverById = async (id) => {
  const driver = await prisma.driver.findUnique({ where: { driver_id: id } });
  if (!driver) {
    throw new ApiError(404, 'Driver not found');
  }
  return driver;
};

const updateDriver = async (id, data) => {
  const driver = await getDriverById(id);

  if (data.license_number && data.license_number !== driver.license_number) {
    const existing = await prisma.driver.findUnique({
      where: { license_number: data.license_number },
    });
    if (existing) {
      throw new ApiError(409, 'Driver with this license number already exists');
    }
  }

  return await prisma.driver.update({
    where: { driver_id: id },
    data,
  });
};

const updateDriverStatus = async (id, status) => {
  await getDriverById(id);
  return await prisma.driver.update({
    where: { driver_id: id },
    data: { status },
  });
};

module.exports = {
  getDrivers,
  createDriver,
  getDriverById,
  updateDriver,
  updateDriverStatus,
};
//checked