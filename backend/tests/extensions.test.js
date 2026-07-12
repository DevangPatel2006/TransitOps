const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const prisma = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-transitops-backend-dev';

describe('TransitOps Extensions Integration Tests', () => {
  let token;
  let user;
  let vehicle;
  let driver;
  let testDoc;

  beforeAll(async () => {
    await prisma.$connect();

    // 1. Clear tables
    await prisma.vehicleDocument.deleteMany({});
    await prisma.licenseReminderLog.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.driver.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});

    // 2. Create Role & User
    const role = await prisma.role.create({
      data: { name: 'FLEET_MANAGER' },
    });

    const hashed = await bcrypt.hash('Passw0rd!', 10);
    user = await prisma.user.create({
      data: {
        full_name: 'Extension Tester',
        email: 'tester@transitops.com',
        password_hash: hashed,
        role_id: role.role_id,
      },
    });

    token = jwt.sign(
      { user_id: user.user_id, role: 'FLEET_MANAGER' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Create initial Vehicle and Driver for testing
    vehicle = await prisma.vehicle.create({
      data: {
        registration_no: 'EXT-101',
        name_model: 'Volvo Heavy Truck',
        type: 'TRUCK',
        max_load_capacity: 15000,
        odometer: 5000,
        acquisition_cost: 85000,
        status: 'AVAILABLE',
      },
    });

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 15); // expires in 15 days

    driver = await prisma.driver.create({
      data: {
        full_name: 'Alice Cooper',
        license_number: 'LIC-ALICE',
        license_category: 'Class A',
        license_expiry: expiryDate,
        contact_number: '9876543210',
        safety_score: 98,
        status: 'AVAILABLE',
      },
    });
  });

  afterAll(async () => {
    // Clean up test documents directory
    const uploadDir = path.join(__dirname, '../uploads/vehicle-docs');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
    }
    await prisma.$disconnect();
  });

  // --- Feature 1: Charts & Visual Analytics ---
  describe('GET /api/analytics/*', () => {
    test('GET /api/analytics/fleet-utilization-trend', async () => {
      const res = await request(app)
        .get('/api/analytics/fleet-utilization-trend?days=7')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(7);
      expect(res.body[0]).toHaveProperty('label');
      expect(res.body[0]).toHaveProperty('utilization');
    });

    test('GET /api/analytics/cost-trend', async () => {
      const res = await request(app)
        .get('/api/analytics/cost-trend?months=3')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body[0]).toHaveProperty('label');
      expect(res.body[0]).toHaveProperty('fuel_cost');
      expect(res.body[0]).toHaveProperty('maintenance_cost');
      expect(res.body[0]).toHaveProperty('expense_cost');
      expect(res.body[0]).toHaveProperty('total');
    });

    test('GET /api/analytics/fuel-efficiency-trend', async () => {
      const res = await request(app)
        .get(`/api/analytics/fuel-efficiency-trend?months=3&vehicleId=${vehicle.vehicle_id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('label');
      expect(res.body[0]).toHaveProperty('distance');
      expect(res.body[0]).toHaveProperty('fuel_consumed');
      expect(res.body[0]).toHaveProperty('efficiency');
    });

    test('GET /api/analytics/trip-volume', async () => {
      const res = await request(app)
        .get('/api/analytics/trip-volume?days=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(5);
      expect(res.body[0]).toHaveProperty('label');
      expect(res.body[0]).toHaveProperty('DRAFT');
      expect(res.body[0]).toHaveProperty('DISPATCHED');
      expect(res.body[0]).toHaveProperty('COMPLETED');
      expect(res.body[0]).toHaveProperty('CANCELLED');
      expect(res.body[0]).toHaveProperty('total');
    });
  });

  // --- Feature 2: PDF Export ---
  describe('GET /api/reports/export/pdf', () => {
    test('Downloads formatted tabular PDF report', async () => {
      const res = await request(app)
        .get('/api/reports/export/pdf?type=vehicles')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });

  // --- Feature 3: Expiry Email Alerts & Job ---
  describe('GET & POST /api/notifications/*', () => {
    test('GET /api/notifications/expiring-licenses', async () => {
      const res = await request(app)
        .get('/api/notifications/expiring-licenses?days=30')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(d => d.driver_id === driver.driver_id)).toBe(true);
    });

    test('POST /api/notifications/expiring-licenses/check runs cron alerts manually', async () => {
      const res = await request(app)
        .post('/api/notifications/expiring-licenses/check')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('License expiry check completed successfully.');

      // Check that it logged to database
      const logs = await prisma.licenseReminderLog.findMany({
        where: { driver_id: driver.driver_id },
      });
      // Alice Cooper expires in 15 days, which matches 15 threshold, so exactly 1 reminder log should exist
      expect(logs.length).toBe(1);
      expect(logs[0].days_before).toBe(15);
    });
  });

  // --- Feature 4: Vehicle Document Management ---
  describe('POST, GET, DELETE /api/vehicles/:id/documents', () => {
    let dummyFilePath;

    beforeAll(() => {
      dummyFilePath = path.join(__dirname, 'dummy.txt');
      fs.writeFileSync(dummyFilePath, 'dummy file content');
    });

    afterAll(() => {
      if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
      }
    });

    test('Uploads vehicle document', async () => {
      const res = await request(app)
        .post(`/api/vehicles/${vehicle.vehicle_id}/documents`)
        .set('Authorization', `Bearer ${token}`)
        .field('doc_type', 'INSURANCE')
        .field('issue_date', '2026-01-01')
        .field('expiry_date', '2027-01-01')
        .attach('document', dummyFilePath);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('document_id');
      expect(res.body.doc_type).toBe('INSURANCE');
      testDoc = res.body;
    });

    test('Lists documents for vehicle', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${vehicle.vehicle_id}/documents`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].document_id).toBe(testDoc.document_id);
    });

    test('Downloads document file', async () => {
      const res = await request(app)
        .get(`/api/vehicle-documents/${testDoc.document_id}/download`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe('dummy file content');
    });

    test('Lists expiring documents', async () => {
      const res = await request(app)
        .get('/api/vehicle-documents/expiring?days=365')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(d => d.document_id === testDoc.document_id)).toBe(true);
    });

    test('Deletes vehicle document', async () => {
      const res = await request(app)
        .delete(`/api/vehicle-documents/${testDoc.document_id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Document deleted successfully');

      const deleted = await prisma.vehicleDocument.findUnique({
        where: { document_id: testDoc.document_id },
      });
      expect(deleted).toBeNull();
    });
  });

  // --- Feature 5: Search, Sort, Filters ---
  describe('Query search, sorting, and filters', () => {
    test('Search match for vehicles', async () => {
      const res = await request(app)
        .get('/api/v1/vehicles?search=Volvo')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].registration_no).toBe('EXT-101');
    });

    test('Sort order and sortBy for vehicles', async () => {
      const res = await request(app)
        .get('/api/v1/vehicles?sortBy=acquisition_cost&sortOrder=desc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].registration_no).toBe('EXT-101'); // 85000 acquisition_cost
    });

    test('Search match for drivers', async () => {
      const res = await request(app)
        .get('/api/v1/drivers?search=Alice')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].full_name).toBe('Alice Cooper');
    });
  });
});
