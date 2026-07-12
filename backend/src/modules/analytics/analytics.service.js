const prisma = require('../../config/db');

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const formatMonth = (date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const getFleetUtilizationTrend = async (days) => {
  const start = getStartOfDay(new Date());
  start.setDate(start.getDate() - days + 1);

  const trips = await prisma.trip.findMany({
    where: {
      status: { not: 'CANCELLED' },
      dispatched_at: { not: null },
    },
    select: {
      vehicle_id: true,
      dispatched_at: true,
      completed_at: true,
    },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: { not: 'RETIRED' },
    },
    select: {
      vehicle_id: true,
      created_at: true,
    },
  });

  const trend = [];

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dayStart = getStartOfDay(dayDate);
    const dayEnd = getEndOfDay(dayDate);

    // Total vehicles active (created before/on this day, non-retired)
    const availableVehicles = vehicles.filter((v) => new Date(v.created_at) <= dayEnd);
    const totalVehiclesCount = availableVehicles.length;

    // Active vehicles on this day (have a trip dispatched on or before dayEnd, completed on or after dayStart or still active)
    const activeVehicleIds = new Set();
    trips.forEach((t) => {
      const dispatched = new Date(t.dispatched_at);
      const completed = t.completed_at ? new Date(t.completed_at) : null;

      if (dispatched <= dayEnd && (!completed || completed >= dayStart)) {
        activeVehicleIds.add(t.vehicle_id);
      }
    });

    // Ensure only counting vehicles present in our active available vehicles
    let activeCount = 0;
    availableVehicles.forEach((v) => {
      if (activeVehicleIds.has(v.vehicle_id)) {
        activeCount++;
      }
    });

    const utilization = totalVehiclesCount > 0 ? (activeCount / totalVehiclesCount) * 100 : 0;

    trend.push({
      label: formatDate(dayDate),
      utilization: Math.round(utilization * 100) / 100,
    });
  }

  return trend;
};

const getCostTrend = async (months) => {
  const start = getStartOfDay(new Date());
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);

  const fuelLogs = await prisma.fuelLog.findMany({
    where: { log_date: { gte: start } },
    select: { cost: true, log_date: true },
  });

  const maintenanceLogs = await prisma.maintenanceLog.findMany({
    where: { opened_at: { gte: start } },
    select: { cost: true, opened_at: true },
  });

  const expenses = await prisma.expense.findMany({
    where: { expense_date: { gte: start } },
    select: { amount: true, expense_date: true },
  });

  const trend = [];

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(start);
    monthDate.setMonth(start.getMonth() + i);

    const m = monthDate.getMonth();
    const y = monthDate.getFullYear();

    let fuelCost = 0;
    let maintenanceCost = 0;
    let expenseCost = 0;

    fuelLogs.forEach((log) => {
      const d = new Date(log.log_date);
      if (d.getMonth() === m && d.getFullYear() === y) {
        fuelCost += Number(log.cost);
      }
    });

    maintenanceLogs.forEach((log) => {
      const d = new Date(log.opened_at);
      if (d.getMonth() === m && d.getFullYear() === y) {
        maintenanceCost += Number(log.cost);
      }
    });

    expenses.forEach((exp) => {
      const d = new Date(exp.expense_date);
      if (d.getMonth() === m && d.getFullYear() === y) {
        expenseCost += Number(exp.amount);
      }
    });

    const total = fuelCost + maintenanceCost + expenseCost;

    trend.push({
      label: formatMonth(monthDate),
      fuel_cost: Math.round(fuelCost * 100) / 100,
      maintenance_cost: Math.round(maintenanceCost * 100) / 100,
      expense_cost: Math.round(expenseCost * 100) / 100,
      total: Math.round(total * 100) / 100,
    });
  }

  return trend;
};

const getFuelEfficiencyTrend = async (vehicleId, months) => {
  const start = getStartOfDay(new Date());
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);

  const where = {
    status: 'COMPLETED',
    completed_at: { gte: start },
  };

  if (vehicleId) {
    where.vehicle_id = vehicleId;
  }

  const trips = await prisma.trip.findMany({
    where,
    select: {
      actual_distance: true,
      fuel_consumed: true,
      completed_at: true,
    },
  });

  const trend = [];

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(start);
    monthDate.setMonth(start.getMonth() + i);

    const m = monthDate.getMonth();
    const y = monthDate.getFullYear();

    let distance = 0;
    let fuel = 0;

    trips.forEach((t) => {
      const d = new Date(t.completed_at);
      if (d.getMonth() === m && d.getFullYear() === y) {
        distance += Number(t.actual_distance || 0);
        fuel += Number(t.fuel_consumed || 0);
      }
    });

    const efficiency = fuel > 0 ? distance / fuel : null;

    trend.push({
      label: formatMonth(monthDate),
      distance: Math.round(distance * 100) / 100,
      fuel_consumed: Math.round(fuel * 100) / 100,
      efficiency: efficiency !== null ? Math.round(efficiency * 100) / 100 : null,
    });
  }

  return trend;
};

const getTripVolumeTrend = async (days) => {
  const start = getStartOfDay(new Date());
  start.setDate(start.getDate() - days + 1);

  const trips = await prisma.trip.findMany({
    where: {
      created_at: { gte: start },
    },
    select: {
      status: true,
      created_at: true,
    },
  });

  const trend = [];

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dayStart = getStartOfDay(dayDate);
    const dayEnd = getEndOfDay(dayDate);

    let draftCount = 0;
    let dispatchedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    trips.forEach((t) => {
      const created = new Date(t.created_at);
      if (created >= dayStart && created <= dayEnd) {
        if (t.status === 'DRAFT') draftCount++;
        else if (t.status === 'DISPATCHED') dispatchedCount++;
        else if (t.status === 'COMPLETED') completedCount++;
        else if (t.status === 'CANCELLED') cancelledCount++;
      }
    });

    const total = draftCount + dispatchedCount + completedCount + cancelledCount;

    trend.push({
      label: formatDate(dayDate),
      DRAFT: draftCount,
      DISPATCHED: dispatchedCount,
      COMPLETED: completedCount,
      CANCELLED: cancelledCount,
      total,
    });
  }

  return trend;
};

module.exports = {
  getFleetUtilizationTrend,
  getCostTrend,
  getFuelEfficiencyTrend,
  getTripVolumeTrend,
};
