const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const getVehicles = async (filters = {}) => {
  const { status, type, region, search } = filters;

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

  return await prisma.vehicle.findMany({ where });
};

const createVehicle = async (data) => {
  const { registration_no } = data;

  const existing = await prisma.vehicle.findUnique({
    where: { registration_no },
  });
  if (existing) {
    throw new ApiError(409, 'Vehicle with this registration number already exists');
  }

  return await prisma.vehicle.create({ data });
};

const getVehicleById = async (id) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { vehicle_id: id } });
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }
  return vehicle;
};

const updateVehicle = async (id, data) => {
  const vehicle = await getVehicleById(id);

  if (data.registration_no && data.registration_no !== vehicle.registration_no) {
    const existing = await prisma.vehicle.findUnique({
      where: { registration_no: data.registration_no },
    });
    if (existing) {
      throw new ApiError(409, 'Vehicle with this registration number already exists');
    }
  }

  return await prisma.vehicle.update({
    where: { vehicle_id: id },
    data,
  });
};

const deleteVehicle = async (id) => {
  // Soft delete: update status to RETIRED
  await getVehicleById(id);
  return await prisma.vehicle.update({
    where: { vehicle_id: id },
    data: { status: 'RETIRED' },
  });
};

const getVehicleCosts = async (id) => {
  const vehicle = await getVehicleById(id);

  const fuelAgg = await prisma.fuelLog.aggregate({
    where: { vehicle_id: id },
    _sum: { cost: true },
  });

  const maintenanceAgg = await prisma.maintenanceLog.aggregate({
    where: { vehicle_id: id },
    _sum: { cost: true },
  });

  const expenseAgg = await prisma.expense.aggregate({
    where: { vehicle_id: id },
    _sum: { amount: true },
  });

  const fuelCost = Number(fuelAgg._sum.cost || 0);
  const maintenanceCost = Number(maintenanceAgg._sum.cost || 0);
  const otherExpensesCost = Number(expenseAgg._sum.amount || 0);
  const totalCost = fuelCost + maintenanceCost + otherExpensesCost;

  return {
    vehicle_id: vehicle.vehicle_id,
    registration_no: vehicle.registration_no,
    name_model: vehicle.name_model,
    fuel_cost: fuelCost,
    maintenance_cost: maintenanceCost,
    other_expenses_cost: otherExpensesCost,
    total_cost: totalCost,
  };
};

module.exports = {
  getVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getVehicleCosts,
};
