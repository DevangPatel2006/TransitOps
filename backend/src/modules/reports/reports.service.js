const prisma = require('../../config/db');
const { exportToCsv } = require('../../utils/csvExporter');
const ApiError = require('../../utils/ApiError');

const getFuelEfficiency = async () => {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: {
        where: { status: 'COMPLETED' },
        select: {
          actual_distance: true,
          fuel_consumed: true,
        },
      },
    },
  });

  return vehicles.map((v) => {
    let totalDistance = 0;
    let totalFuel = 0;

    v.trips.forEach((t) => {
      totalDistance += Number(t.actual_distance || 0);
      totalFuel += Number(t.fuel_consumed || 0);
    });

    const efficiency = totalFuel > 0 ? totalDistance / totalFuel : null;

    return {
      vehicle_id: v.vehicle_id,
      registration_no: v.registration_no,
      name_model: v.name_model,
      total_distance: totalDistance,
      total_fuel_consumed: totalFuel,
      fuel_efficiency: efficiency,
    };
  });
};

const getUtilization = async () => {
  const activeVehicles = await prisma.vehicle.count({
    where: { status: 'ON_TRIP' },
  });

  const totalNonRetired = await prisma.vehicle.count({
    where: { status: { not: 'RETIRED' } },
  });

  let utilizationPct = 0;
  if (totalNonRetired > 0) {
    utilizationPct = (activeVehicles / totalNonRetired) * 100;
  }
  utilizationPct = Math.round(utilizationPct * 100) / 100;

  return {
    activeVehicles,
    totalNonRetired,
    utilizationPct,
  };
};

const getROI = async () => {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: {
        where: { status: 'COMPLETED' },
        select: { revenue: true },
      },
      fuel_logs: {
        select: { cost: true },
      },
      maintenance_logs: {
        select: { cost: true },
      },
    },
  });

  return vehicles.map((v) => {
    let revenue = 0;
    let fuel_cost = 0;
    let maintenance_cost = 0;

    v.trips.forEach((t) => {
      revenue += Number(t.revenue || 0);
    });

    v.fuel_logs.forEach((f) => {
      fuel_cost += Number(f.cost || 0);
    });

    v.maintenance_logs.forEach((m) => {
      maintenance_cost += Number(m.cost || 0);
    });

    const acquisition_cost = Number(v.acquisition_cost);
    const roi = acquisition_cost > 0 ? (revenue - (maintenance_cost + fuel_cost)) / acquisition_cost : 0;

    return {
      vehicle_id: v.vehicle_id,
      registration_no: v.registration_no,
      name_model: v.name_model,
      revenue,
      maintenance_cost,
      fuel_cost,
      acquisition_cost,
      roi: Math.round(roi * 10000) / 10000, // Round to 4 decimal places (e.g. 0.1234 for 12.34%)
    };
  });
};

const getExportData = async (type) => {
  if (type === 'vehicles') {
    const list = await prisma.vehicle.findMany();
    const formatted = list.map((v) => ({
      vehicle_id: v.vehicle_id,
      registration_no: v.registration_no,
      name_model: v.name_model,
      type: v.type,
      max_load_capacity: Number(v.max_load_capacity),
      odometer: Number(v.odometer),
      acquisition_cost: Number(v.acquisition_cost),
      region: v.region || '',
      status: v.status,
    }));
    const headers = ['vehicle_id', 'registration_no', 'name_model', 'type', 'max_load_capacity', 'odometer', 'acquisition_cost', 'region', 'status'];
    return exportToCsv(formatted, headers);
  }

  if (type === 'drivers') {
    const list = await prisma.driver.findMany();
    const formatted = list.map((d) => ({
      driver_id: d.driver_id,
      full_name: d.full_name,
      license_number: d.license_number,
      license_category: d.license_category,
      license_expiry: d.license_expiry.toISOString().split('T')[0],
      contact_number: d.contact_number,
      safety_score: Number(d.safety_score),
      status: d.status,
    }));
    const headers = ['driver_id', 'full_name', 'license_number', 'license_category', 'license_expiry', 'contact_number', 'safety_score', 'status'];
    return exportToCsv(formatted, headers);
  }
//checck
  if (type === 'trips') {
    const list = await prisma.trip.findMany();
    const formatted = list.map((t) => ({
      trip_id: t.trip_id,
      source: t.source,
      destination: t.destination,
      vehicle_id: t.vehicle_id,
      driver_id: t.driver_id,
      cargo_weight: Number(t.cargo_weight),
      planned_distance: Number(t.planned_distance),
      actual_distance: t.actual_distance ? Number(t.actual_distance) : '',
      fuel_consumed: t.fuel_consumed ? Number(t.fuel_consumed) : '',
      revenue: Number(t.revenue || 0),
      status: t.status,
    }));
    const headers = ['trip_id', 'source', 'destination', 'vehicle_id', 'driver_id', 'cargo_weight', 'planned_distance', 'actual_distance', 'fuel_consumed', 'revenue', 'status'];
    return exportToCsv(formatted, headers);
  }

  if (type === 'costs') {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        fuel_logs: { select: { cost: true } },
        maintenance_logs: { select: { cost: true } },
        expenses: { select: { amount: true } },
      },
    });

    const formatted = vehicles.map((v) => {
      let fuelCost = 0;
      let maintenanceCost = 0;
      let otherExpenses = 0;

      v.fuel_logs.forEach((f) => (fuelCost += Number(f.cost)));
      v.maintenance_logs.forEach((m) => (maintenanceCost += Number(m.cost)));
      v.expenses.forEach((e) => (otherExpenses += Number(e.amount)));

      const total = fuelCost + maintenanceCost + otherExpenses;

      return {
        vehicle_id: v.vehicle_id,
        registration_no: v.registration_no,
        fuel_cost: fuelCost,
        maintenance_cost: maintenanceCost,
        other_expenses_cost: otherExpenses,
        total_cost: total,
      };
    });

    const headers = ['vehicle_id', 'registration_no', 'fuel_cost', 'maintenance_cost', 'other_expenses_cost', 'total_cost'];
    return exportToCsv(formatted, headers);
  }

  throw new ApiError(400, 'Invalid export type. Must be one of vehicles, drivers, trips, or costs.');
};

module.exports = {
  getFuelEfficiency,
  getUtilization,
  getROI,
  getExportData,
};
//checked working