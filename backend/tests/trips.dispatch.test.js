const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const prisma = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-transitops-backend-dev';

describe('TransitOps Trip Dispatch Integration Tests', () => {
  let managerToken;
  let driverOpsToken;
  let managerUser;
  let driverOpsUser;

  let rolesMap = {};

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 1. Clear database
    await prisma.expense.deleteMany({});
    await prisma.fuelLog.deleteMany({});
    await prisma.maintenanceLog.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.driver.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});

    // 2. Seed roles
    const roleNames = ['FLEET_MANAGER', 'DRIVER_OPS', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];
    for (const name of roleNames) {
      rolesMap[name] = await prisma.role.create({
        data: { name },
      });
    }

    // 3. Seed users
    const hashed = await bcrypt.hash('Passw0rd!', 10); // Lower cost for faster tests

    managerUser = await prisma.user.create({
      data: {
        full_name: 'Test Manager',
        email: 'manager@test.com',
        password_hash: hashed,
        role_id: rolesMap['FLEET_MANAGER'].role_id,
      },
    });

    driverOpsUser = await prisma.user.create({
      data: {
        full_name: 'Test Driver Ops',
        email: 'driverops@test.com',
        password_hash: hashed,
        role_id: rolesMap['DRIVER_OPS'].role_id,
      },
    });

    // 4. Generate JWT tokens
    managerToken = jwt.sign(
      { user_id: managerUser.user_id, role: 'FLEET_MANAGER' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    driverOpsToken = jwt.sign(
      { user_id: driverOpsUser.user_id, role: 'DRIVER_OPS' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  test('Dispatch succeeds when cargo <= capacity, vehicle & driver both AVAILABLE', async () => {
    // Seed vehicle and driver
    const vehicle = await prisma.vehicle.create({
      data: {
        registration_no: 'VAN-101',
        name_model: 'Ford Van',
        type: 'VAN',
        max_load_capacity: 1000,
        odometer: 10000,
        acquisition_cost: 20000,
        status: 'AVAILABLE',
      },
    });

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const driver = await prisma.driver.create({
      data: {
        full_name: 'John Doe',
        license_number: 'LIC-001',
        license_category: 'Class A',
        license_expiry: expiryDate,
        contact_number: '1234567890',
        safety_score: 95,
        status: 'AVAILABLE',
      },
    });

    // Create Trip (DRAFT)
    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Warehouse A',
        destination: 'Warehouse B',
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.driver_id,
        cargo_weight: 800,
        planned_distance: 150,
      });

    expect(tripRes.status).toBe(201);
    const tripId = tripRes.body.trip_id;

    // Dispatch Trip
    const dispatchRes = await request(app)
      .post(`/api/v1/trips/${tripId}/dispatch`)
      .set('Authorization', `Bearer ${driverOpsToken}`);

    expect(dispatchRes.status).toBe(200);
    expect(dispatchRes.body.trip.status).toBe('DISPATCHED');

    // Verify database states
    const updatedVehicle = await prisma.vehicle.findUnique({ where: { vehicle_id: vehicle.vehicle_id } });
    const updatedDriver = await prisma.driver.findUnique({ where: { driver_id: driver.driver_id } });

    expect(updatedVehicle.status).toBe('ON_TRIP');
    expect(updatedDriver.status).toBe('ON_TRIP');
  });

  test('Dispatch rejected (422) when cargo > capacity', async () => {
    const vehicle = await prisma.vehicle.create({
      data: {
        registration_no: 'VAN-102',
        name_model: 'Ford Van',
        type: 'VAN',
        max_load_capacity: 500,
        odometer: 10000,
        acquisition_cost: 20000,
        status: 'AVAILABLE',
      },
    });

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const driver = await prisma.driver.create({
      data: {
        full_name: 'John Doe',
        license_number: 'LIC-002',
        license_category: 'Class A',
        license_expiry: expiryDate,
        contact_number: '1234567890',
        safety_score: 95,
        status: 'AVAILABLE',
      },
    });

    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Warehouse A',
        destination: 'Warehouse B',
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.driver_id,
        cargo_weight: 600, // exceeds 500
        planned_distance: 150,
      });

    expect(tripRes.status).toBe(422);
    expect(tripRes.body.error).toContain('exceeds vehicle\'s maximum load capacity');
  });

  test('Dispatch rejected (409) when driver license expired', async () => {
    const vehicle = await prisma.vehicle.create({
      data: {
        registration_no: 'VAN-103',
        name_model: 'Ford Van',
        type: 'VAN',
        max_load_capacity: 1000,
        odometer: 10000,
        acquisition_cost: 20000,
        status: 'AVAILABLE',
      },
    });

    const expiredDate = new Date();
    expiredDate.setFullYear(expiredDate.getFullYear() - 1); // Expired 1 year ago

    const driver = await prisma.driver.create({
      data: {
        full_name: 'John Doe',
        license_number: 'LIC-003',
        license_category: 'Class A',
        license_expiry: expiredDate,
        contact_number: '1234567890',
        safety_score: 95,
        status: 'AVAILABLE',
      },
    });

    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Warehouse A',
        destination: 'Warehouse B',
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.driver_id,
        cargo_weight: 800,
        planned_distance: 150,
      });

    expect(tripRes.status).toBe(409);
    expect(tripRes.body.error).toContain('license is expired');
  });

  test('Dispatch rejected (409) when vehicle already ON_TRIP', async () => {
    const vehicle = await prisma.vehicle.create({
      data: {
        registration_no: 'VAN-104',
        name_model: 'Ford Van',
        type: 'VAN',
        max_load_capacity: 1000,
        odometer: 10000,
        acquisition_cost: 20000,
        status: 'ON_TRIP', // Already on trip
      },
    });

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const driver = await prisma.driver.create({
      data: {
        full_name: 'John Doe',
        license_number: 'LIC-004',
        license_category: 'Class A',
        license_expiry: expiryDate,
        contact_number: '1234567890',
        safety_score: 95,
        status: 'AVAILABLE',
      },
    });

    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Warehouse A',
        destination: 'Warehouse B',
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.driver_id,
        cargo_weight: 800,
        planned_distance: 150,
      });

    expect(tripRes.status).toBe(409);
    expect(tripRes.body.error).toContain('already assigned');
  });

  test('Complete correctly returns both vehicle and driver to AVAILABLE', async () => {
    const vehicle = await prisma.vehicle.create({
      data: {
        registration_no: 'VAN-105',
        name_model: 'Ford Van',
        type: 'VAN',
        max_load_capacity: 1000,
        odometer: 10000,
        acquisition_cost: 20000,
        status: 'AVAILABLE',
      },
    });

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const driver = await prisma.driver.create({
      data: {
        full_name: 'John Doe',
        license_number: 'LIC-005',
        license_category: 'Class A',
        license_expiry: expiryDate,
        contact_number: '1234567890',
        safety_score: 95,
        status: 'AVAILABLE',
      },
    });

    // Create DRAFT trip
    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Warehouse A',
        destination: 'Warehouse B',
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.driver_id,
        cargo_weight: 800,
        planned_distance: 150,
      });

    const tripId = tripRes.body.trip_id;

    // Dispatch trip (switches statuses to ON_TRIP)
    await request(app)
      .post(`/api/v1/trips/${tripId}/dispatch`)
      .set('Authorization', `Bearer ${driverOpsToken}`);

    // Complete trip
    const completeRes = await request(app)
      .post(`/api/v1/trips/${tripId}/complete`)
      .set('Authorization', `Bearer ${driverOpsToken}`)
      .send({
        final_odometer: 10150, // 150 actual distance
        fuel_consumed: 15,
        revenue: 500,
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.trip.status).toBe('COMPLETED');
    expect(Number(completeRes.body.trip.actual_distance)).toBe(150);

    // Check availability
    const updatedVehicle = await prisma.vehicle.findUnique({ where: { vehicle_id: vehicle.vehicle_id } });
    const updatedDriver = await prisma.driver.findUnique({ where: { driver_id: driver.driver_id } });

    expect(updatedVehicle.status).toBe('AVAILABLE');
    expect(Number(updatedVehicle.odometer)).toBe(10150);
    expect(updatedDriver.status).toBe('AVAILABLE');
  });

  test('Cancel correctly restores AVAILABLE status', async () => {
    const vehicle = await prisma.vehicle.create({
      data: {
        registration_no: 'VAN-106',
        name_model: 'Ford Van',
        type: 'VAN',
        max_load_capacity: 1000,
        odometer: 10000,
        acquisition_cost: 20000,
        status: 'AVAILABLE',
      },
    });

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const driver = await prisma.driver.create({
      data: {
        full_name: 'John Doe',
        license_number: 'LIC-006',
        license_category: 'Class A',
        license_expiry: expiryDate,
        contact_number: '1234567890',
        safety_score: 95,
        status: 'AVAILABLE',
      },
    });

    // Create DRAFT trip
    const tripRes = await request(app)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        source: 'Warehouse A',
        destination: 'Warehouse B',
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.driver_id,
        cargo_weight: 800,
        planned_distance: 150,
      });

    const tripId = tripRes.body.trip_id;

    // Dispatch
    await request(app)
      .post(`/api/v1/trips/${tripId}/dispatch`)
      .set('Authorization', `Bearer ${driverOpsToken}`);

    // Cancel
    const cancelRes = await request(app)
      .post(`/api/v1/trips/${tripId}/cancel`)
      .set('Authorization', `Bearer ${driverOpsToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.trip.status).toBe('CANCELLED');

    const updatedVehicle = await prisma.vehicle.findUnique({ where: { vehicle_id: vehicle.vehicle_id } });
    const updatedDriver = await prisma.driver.findUnique({ where: { driver_id: driver.driver_id } });

    expect(updatedVehicle.status).toBe('AVAILABLE');
    expect(updatedDriver.status).toBe('AVAILABLE');
  });

  test('Two concurrent dispatch requests for the same vehicle: only one should succeed', async () => {
    const vehicle = await prisma.vehicle.create({
      data: {
        registration_no: 'VAN-CONC',
        name_model: 'Ford Van',
        type: 'VAN',
        max_load_capacity: 1000,
        odometer: 10000,
        acquisition_cost: 20000,
        status: 'AVAILABLE',
      },
    });

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const driver1 = await prisma.driver.create({
      data: {
        full_name: 'Driver One',
        license_number: 'LIC-C1',
        license_category: 'Class A',
        license_expiry: expiryDate,
        contact_number: '1234567890',
        safety_score: 95,
        status: 'AVAILABLE',
      },
    });

    const driver2 = await prisma.driver.create({
      data: {
        full_name: 'Driver Two',
        license_number: 'LIC-C2',
        license_category: 'Class A',
        license_expiry: expiryDate,
        contact_number: '1234567891',
        safety_score: 95,
        status: 'AVAILABLE',
      },
    });

    // Create 2 draft trips using the SAME vehicle but different drivers
    const trip1Res = await prisma.trip.create({
      data: {
        source: 'Warehouse A',
        destination: 'Warehouse B',
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver1.driver_id,
        cargo_weight: 800,
        planned_distance: 150,
        status: 'DRAFT',
        created_by: managerUser.user_id,
      },
    });

    const trip2Res = await prisma.trip.create({
      data: {
        source: 'Warehouse A',
        destination: 'Warehouse C',
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver2.driver_id,
        cargo_weight: 800,
        planned_distance: 150,
        status: 'DRAFT',
        created_by: managerUser.user_id,
      },
    });

    // Fire dispatches concurrently
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/trips/${trip1Res.trip_id}/dispatch`)
        .set('Authorization', `Bearer ${driverOpsToken}`),
      request(app)
        .post(`/api/v1/trips/${trip2Res.trip_id}/dispatch`)
        .set('Authorization', `Bearer ${driverOpsToken}`),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
  });
});
