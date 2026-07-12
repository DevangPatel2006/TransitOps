const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  // Delete in reverse order of foreign key dependencies
  await prisma.expense.deleteMany({});
  await prisma.fuelLog.deleteMany({});
  await prisma.maintenanceLog.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  console.log('Seeding roles...');
  const roleNames = ['FLEET_MANAGER', 'DRIVER_OPS', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];
  const roles = {};

  for (const name of roleNames) {
    roles[name] = await prisma.role.create({
      data: { name },
    });
  }

  console.log('Seeding users...');
  const hashedDefaultPassword = await bcrypt.hash('Passw0rd!', 12);

  const managerUser = await prisma.user.create({
    data: {
      full_name: 'Fleet Manager User',
      email: 'manager@transitops.com',
      password_hash: hashedDefaultPassword,
      role_id: roles['FLEET_MANAGER'].role_id,
    },
  });

  const driverOpsUser = await prisma.user.create({
    data: {
      full_name: 'Driver Ops User',
      email: 'driverops@transitops.com',
      password_hash: hashedDefaultPassword,
      role_id: roles['DRIVER_OPS'].role_id,
    },
  });

  const safetyUser = await prisma.user.create({
    data: {
      full_name: 'Safety Officer User',
      email: 'safety@transitops.com',
      password_hash: hashedDefaultPassword,
      role_id: roles['SAFETY_OFFICER'].role_id,
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      full_name: 'Financial Analyst User',
      email: 'finance@transitops.com',
      password_hash: hashedDefaultPassword,
      role_id: roles['FINANCIAL_ANALYST'].role_id,
    },
  });

  console.log('Seeding vehicles...');
  // Van-05 is AVAILABLE for dispatching demo
  const van05 = await prisma.vehicle.create({
    data: {
      registration_no: 'Van-05',
      name_model: 'Ford Transit',
      type: 'VAN',
      max_load_capacity: 500,
      odometer: 12000,
      acquisition_cost: 32000,
      region: 'North',
      status: 'AVAILABLE',
    },
  });

  const truck01 = await prisma.vehicle.create({
    data: {
      registration_no: 'Truck-01',
      name_model: 'Volvo FH16',
      type: 'TRUCK',
      max_load_capacity: 15000,
      odometer: 85000,
      acquisition_cost: 110000,
      region: 'East',
      status: 'ON_TRIP',
    },
  });

  const truck02 = await prisma.vehicle.create({
    data: {
      registration_no: 'Truck-02',
      name_model: 'Scania R500',
      type: 'TRUCK',
      max_load_capacity: 18000,
      odometer: 45000,
      acquisition_cost: 95000,
      region: 'West',
      status: 'IN_SHOP', // For maintenance log open
    },
  });

  const bike01 = await prisma.vehicle.create({
    data: {
      registration_no: 'Bike-01',
      name_model: 'Yamaha Cargo',
      type: 'BIKE',
      max_load_capacity: 50,
      odometer: 1500,
      acquisition_cost: 4000,
      region: 'South',
      status: 'RETIRED',
    },
  });

  const van02 = await prisma.vehicle.create({
    data: {
      registration_no: 'Van-02',
      name_model: 'Mercedes Sprinter',
      type: 'VAN',
      max_load_capacity: 1200,
      odometer: 35000,
      acquisition_cost: 45000,
      region: 'North',
      status: 'AVAILABLE',
    },
  });

  const trailer01 = await prisma.vehicle.create({
    data: {
      registration_no: 'Trailer-01',
      name_model: 'Krone Mega Carrier',
      type: 'TRAILER',
      max_load_capacity: 24000,
      odometer: 50000,
      acquisition_cost: 25000,
      region: 'South',
      status: 'AVAILABLE',
    },
  });

  console.log('Seeding drivers...');
  // Alex is AVAILABLE for dispatching demo (license valid until 6 months in the future)
  const futureExpiry = new Date();
  futureExpiry.setMonth(futureExpiry.getMonth() + 6);

  const alex = await prisma.driver.create({
    data: {
      full_name: 'Alex Carter',
      license_number: 'DL-112233',
      license_category: 'Class A',
      license_expiry: futureExpiry,
      contact_number: '+1234567890',
      safety_score: 95,
      status: 'AVAILABLE',
    },
  });

  const bob = await prisma.driver.create({
    data: {
      full_name: 'Bob Miller',
      license_number: 'DL-445566',
      license_category: 'Class A',
      license_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      contact_number: '+1234567891',
      safety_score: 88,
      status: 'ON_TRIP',
    },
  });

  const charlie = await prisma.driver.create({
    data: {
      full_name: 'Charlie Davis',
      license_number: 'DL-778899',
      license_category: 'Class B',
      license_expiry: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired 30 days ago
      contact_number: '+1234567892',
      safety_score: 75,
      status: 'AVAILABLE',
    },
  });

  const david = await prisma.driver.create({
    data: {
      full_name: 'David Evans',
      license_number: 'DL-001122',
      license_category: 'Class A',
      license_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      contact_number: '+1234567893',
      safety_score: 60,
      status: 'SUSPENDED',
    },
  });

  const emma = await prisma.driver.create({
    data: {
      full_name: 'Emma Wilson',
      license_number: 'DL-334455',
      license_category: 'Class B',
      license_expiry: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), // 8 months
      contact_number: '+1234567894',
      safety_score: 92,
      status: 'AVAILABLE',
    },
  });

  const frank = await prisma.driver.create({
    data: {
      full_name: 'Frank Jones',
      license_number: 'DL-667788',
      license_category: 'Class A',
      license_expiry: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000), // 18 months
      contact_number: '+1234567895',
      safety_score: 100,
      status: 'AVAILABLE',
    },
  });

  console.log('Seeding trips...');
  const tripDraft = await prisma.trip.create({
    data: {
      source: 'Warehouse A',
      destination: 'Store B',
      vehicle_id: van02.vehicle_id,
      driver_id: emma.driver_id,
      cargo_weight: 400,
      planned_distance: 120,
      status: 'DRAFT',
      created_by: managerUser.user_id,
    },
  });

  const tripDispatched = await prisma.trip.create({
    data: {
      source: 'Port East',
      destination: 'Hub Central',
      vehicle_id: truck01.vehicle_id,
      driver_id: bob.driver_id,
      cargo_weight: 8000,
      planned_distance: 450,
      status: 'DISPATCHED',
      created_by: driverOpsUser.user_id,
      dispatched_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
  });

  // Completed trip on Van-05 and Alex
  const tripCompleted = await prisma.trip.create({
    data: {
      source: 'Depot North',
      destination: 'Supermarket East',
      vehicle_id: van05.vehicle_id,
      driver_id: alex.driver_id,
      cargo_weight: 300,
      planned_distance: 80,
      actual_distance: 82,
      fuel_consumed: 10,
      revenue: 450,
      status: 'COMPLETED',
      created_by: managerUser.user_id,
      dispatched_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
      completed_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
  });

  console.log('Seeding fuel logs, maintenance logs, and expenses...');
  // Fuel log tied to Van-05 trip
  await prisma.fuelLog.create({
    data: {
      vehicle_id: van05.vehicle_id,
      trip_id: tripCompleted.trip_id,
      liters: 25,
      cost: 35.5,
      log_date: new Date(),
    },
  });

  // General fuel log on Truck-01
  await prisma.fuelLog.create({
    data: {
      vehicle_id: truck01.vehicle_id,
      liters: 150,
      cost: 220,
      log_date: new Date(),
    },
  });

  // Open maintenance record on Truck-02 (matches status IN_SHOP)
  await prisma.maintenanceLog.create({
    data: {
      vehicle_id: truck02.vehicle_id,
      description: 'Engine oil change and brake pad check',
      cost: 300,
      status: 'OPEN',
      opened_at: new Date(),
    },
  });

  // Expense on Truck-01
  await prisma.expense.create({
    data: {
      vehicle_id: truck01.vehicle_id,
      type: 'TOLL',
      amount: 45,
      notes: 'Highway 88 Toll',
      expense_date: new Date(),
    },
  });

  // Expense on Van-05
  await prisma.expense.create({
    data: {
      vehicle_id: van05.vehicle_id,
      type: 'PARKING',
      amount: 15,
      notes: 'City center parking',
      expense_date: new Date(),
    },
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
