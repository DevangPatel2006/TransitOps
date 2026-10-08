/**
 * Production-readiness API Verification Test Script
 * Non-destructive verification of all modules and security gates.
 */
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (_) {
          json = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(options.body));
      }
    }
    req.end();
  });
}

function sendMultipart(path, boundary, buffer, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': buffer.length,
        ...headers,
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PRODUCTION API VERIFICATION TESTS ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${extra}`);
      failed++;
    }
  }

  // 1. Health endpoint
  const healthRes = await request('/health');
  assert(healthRes.status === 200 && healthRes.data.status === 'ok' && healthRes.data.database === 'connected', 'GET /health returns 200 with ok and connected status');

  // 2. Auth missing JWT
  const unauthRes = await request('/api/v1/vehicles');
  assert(unauthRes.status === 401, 'Missing JWT returns 401 Unauthorized');

  // 3. Auth invalid JWT
  const invalidJwtRes = await request('/api/v1/vehicles', {
    headers: { Authorization: 'Bearer this-is-not-a-valid-token' },
  });
  assert(invalidJwtRes.status === 401, 'Invalid JWT returns 401 Unauthorized');

  // 4. Register a unique manager test user
  const uniqueSuffix = Date.now();
  const testManagerEmail = `test_mgr_${uniqueSuffix}@example.com`;
  const registerRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      full_name: 'Test Fleet Manager',
      email: testManagerEmail,
      password: 'StrongPassword123!',
      role: 'FLEET_MANAGER',
    },
  });
  assert(registerRes.status === 201 && registerRes.data.email === testManagerEmail, 'POST /api/v1/auth/register creates user');

  // 5. Test duplicate registration
  const duplicateRegRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      full_name: 'Duplicate Manager',
      email: testManagerEmail,
      password: 'StrongPassword123!',
      role: 'FLEET_MANAGER',
    },
  });
  assert(duplicateRegRes.status === 409, 'POST /api/v1/auth/register rejects duplicate email with 409');

  // 6. Login manager
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: testManagerEmail,
      password: 'StrongPassword123!',
    },
  });
  assert(loginRes.status === 200 && loginRes.data.token, 'POST /api/v1/auth/login succeeds and returns JWT');
  const managerToken = loginRes.data.token;

  // 7. GET /api/v1/auth/me
  const meRes = await request('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(meRes.status === 200 && meRes.data.email === testManagerEmail && meRes.data.role.name === 'FLEET_MANAGER', 'GET /api/v1/auth/me returns authenticated manager profile');

  // 8. Register and login a Financial Analyst user (for role testing)
  const testFinanceEmail = `test_fin_${uniqueSuffix}@example.com`;
  await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      full_name: 'Test Financial Analyst',
      email: testFinanceEmail,
      password: 'StrongPassword123!',
      role: 'FINANCIAL_ANALYST',
    },
  });
  const financeLoginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: testFinanceEmail,
      password: 'StrongPassword123!',
    },
  });
  const financeToken = financeLoginRes.data.token;

  // 9. Role restriction test: Financial Analyst cannot create vehicle (requires FLEET_MANAGER)
  const forbiddenVehicleRes = await request('/api/v1/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${financeToken}` },
    body: {
      registration_no: `REG-${uniqueSuffix}`,
      name_model: 'Volvo FH16',
      type: 'TRUCK',
      max_load_capacity: 25000,
      acquisition_cost: 120000,
    },
  });
  assert(forbiddenVehicleRes.status === 403, 'Role restriction enforces 403 when FINANCIAL_ANALYST tries to create vehicle');

  // 10. Invalid request validation test (missing required fields)
  const invalidDataRes = await request('/api/v1/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      name_model: 'Volvo FH16',
    },
  });
  assert(invalidDataRes.status === 400, 'Zod validator rejects incomplete vehicle data with 400');

  // 11. Create vehicle as FLEET_MANAGER
  const regNo = `TRK-${uniqueSuffix}`;
  const createVehicleRes = await request('/api/v1/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      registration_no: regNo,
      name_model: 'Volvo FH16 Heavy',
      type: 'TRUCK',
      max_load_capacity: 25000,
      odometer: 1000,
      acquisition_cost: 120000,
      region: 'North',
    },
  });
  assert(createVehicleRes.status === 201 && createVehicleRes.data.vehicle_id, 'POST /api/v1/vehicles creates vehicle successfully');
  const vehicleId = createVehicleRes.data?.vehicle_id;

  // 12. Nonexistent vehicle ID test
  const nonExistentVehicleRes = await request('/api/v1/vehicles/999999999', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(nonExistentVehicleRes.status === 404, 'GET nonexistent vehicle returns 404');

  // 13. GET vehicles list
  const getVehiclesRes = await request('/api/v1/vehicles', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(getVehiclesRes.status === 200 && Array.isArray(getVehiclesRes.data), 'GET /api/v1/vehicles returns array of vehicles');

  // 14. Create Driver as FLEET_MANAGER
  const licenseNo = `LIC-${uniqueSuffix}`;
  const createDriverRes = await request('/api/v1/drivers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      full_name: 'John Test Driver',
      license_number: licenseNo,
      license_category: 'COMMERCIAL',
      license_expiry: '2027-12-31',
      contact_number: '+1-555-0199',
    },
  });
  assert(createDriverRes.status === 201 && createDriverRes.data.driver_id, 'POST /api/v1/drivers creates driver successfully');
  const driverId = createDriverRes.data?.driver_id;

  // 15. GET drivers list
  const getDriversRes = await request('/api/v1/drivers', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(getDriversRes.status === 200 && Array.isArray(getDriversRes.data), 'GET /api/v1/drivers returns array of drivers');

  // 16. Create Trip as FLEET_MANAGER
  const createTripRes = await request('/api/v1/trips', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      source: 'Warehouse Alpha',
      destination: 'Distribution Beta',
      vehicle_id: vehicleId,
      driver_id: driverId,
      cargo_weight: 15000,
      planned_distance: 250,
      revenue: 3500,
    },
  });
  assert(createTripRes.status === 201 && createTripRes.data.trip_id, 'POST /api/v1/trips creates trip successfully');
  const tripId = createTripRes.data?.trip_id;

  // 17. GET trips
  const getTripsRes = await request('/api/v1/trips', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(getTripsRes.status === 200 && Array.isArray(getTripsRes.data), 'GET /api/v1/trips returns list of trips');

  // 18. Dispatch Trip
  const dispatchTripRes = await request(`/api/v1/trips/${tripId}/dispatch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(dispatchTripRes.status === 200 && dispatchTripRes.data?.trip?.status === 'DISPATCHED', 'POST /api/v1/trips/:id/dispatch dispatches trip');

  // 19. Complete Trip (requires final_odometer, fuel_consumed, revenue)
  const completeTripRes = await request(`/api/v1/trips/${tripId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      final_odometer: 1255,
      fuel_consumed: 60,
      revenue: 3500,
    },
  });
  assert(completeTripRes.status === 200 && completeTripRes.data?.trip?.status === 'COMPLETED', 'POST /api/v1/trips/:id/complete completes trip', JSON.stringify(completeTripRes.data));

  // 20. Maintenance endpoints (vehicle is now AVAILABLE again)
  const createMaintRes = await request('/api/v1/maintenance', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      vehicle_id: vehicleId,
      description: 'Scheduled 5000km oil and brake inspection',
      cost: 450,
    },
  });
  assert(createMaintRes.status === 201 && createMaintRes.data?.maintenance_id, 'POST /api/v1/maintenance creates maintenance record', JSON.stringify(createMaintRes.data));
  const maintId = createMaintRes.data?.maintenance_id;

  const closeMaintRes = await request(`/api/v1/maintenance/${maintId}/close`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(closeMaintRes.status === 200 && closeMaintRes.data?.log?.status === 'CLOSED', 'PUT /api/v1/maintenance/:id/close closes maintenance record', JSON.stringify(closeMaintRes.data));

  // 21. Fuel & Expense endpoints
  const fuelRes = await request('/api/v1/fuel-logs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      vehicle_id: vehicleId,
      trip_id: tripId,
      liters: 60,
      cost: 180,
      log_date: '2026-10-08',
    },
  });
  assert(fuelRes.status === 201 && fuelRes.data.fuel_log_id, 'POST /api/v1/fuel-logs logs fuel entry');

  const expenseRes = await request('/api/v1/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: {
      vehicle_id: vehicleId,
      type: 'TOLL',
      amount: 45,
      expense_date: '2026-10-08',
      notes: 'Highway expressway toll fee',
    },
  });
  assert(expenseRes.status === 201 && expenseRes.data.expense_id, 'POST /api/v1/expenses creates expense record');

  // 22. Dashboard KPIs
  const kpiRes = await request('/api/v1/dashboard/kpis', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(kpiRes.status === 200 && typeof kpiRes.data.activeVehicles === 'number', 'GET /api/v1/dashboard/kpis returns KPI statistics');

  // 23. Analytics endpoints
  const utilTrendRes = await request('/api/v1/analytics/fleet-utilization-trend', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(utilTrendRes.status === 200, 'GET /api/v1/analytics/fleet-utilization-trend returns 200');

  const costTrendRes = await request('/api/v1/analytics/cost-trend', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(costTrendRes.status === 200, 'GET /api/v1/analytics/cost-trend returns 200');

  // 24. Reports endpoints
  const fuelEffRes = await request('/api/v1/reports/fuel-efficiency', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(fuelEffRes.status === 200, 'GET /api/v1/reports/fuel-efficiency returns 200');

  const csvRes = await request('/api/v1/reports/export.csv?type=vehicles', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(csvRes.status === 200 && csvRes.headers['content-type']?.includes('text/csv'), 'GET /api/v1/reports/export.csv returns CSV file');

  const pdfRes = await request('/api/v1/reports/export/pdf?type=vehicles', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(pdfRes.status === 200 && pdfRes.headers['content-type']?.includes('application/pdf'), 'GET /api/v1/reports/export/pdf returns PDF file');

  // 25. Notifications endpoint
  const notifRes = await request('/api/v1/notifications/expiring-licenses', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(notifRes.status === 200 && Array.isArray(notifRes.data), 'GET /api/v1/notifications/expiring-licenses returns expiring driver list');

  // 26. Document Upload - Validation test (disallow executable file upload)
  const boundary = '----TransitOpsTestBoundary' + Date.now();
  const exePayload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="doc_type"\r\n\r\nINSURANCE\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="issue_date"\r\n\r\n2026-01-01\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="expiry_date"\r\n\r\n2027-01-01\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="malicious.exe"\r\nContent-Type: application/x-msdownload\r\n\r\nBINARYDATA\r\n`),
    Buffer.from(`--${boundary}--\r\n`),
  ]);
  const exeUploadRes = await sendMultipart(`/api/v1/vehicles/${vehicleId}/documents`, boundary, exePayload, {
    Authorization: `Bearer ${managerToken}`,
  });
  assert(exeUploadRes.status === 400, 'Upload validation blocks executable .exe file with 400');

  // 27. Document Upload - Valid PDF upload
  const pdfPayload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="doc_type"\r\n\r\nINSURANCE\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="issue_date"\r\n\r\n2026-01-01\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="expiry_date"\r\n\r\n2027-01-01\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="policy_contract.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4 sample pdf content\r\n`),
    Buffer.from(`--${boundary}--\r\n`),
  ]);
  const docUploadRes = await sendMultipart(`/api/v1/vehicles/${vehicleId}/documents`, boundary, pdfPayload, {
    Authorization: `Bearer ${managerToken}`,
  });
  assert(docUploadRes.status === 201 && docUploadRes.data.document_id, 'Upload valid PDF document succeeds with 201');
  const docId = docUploadRes.data?.document_id;

  // 28. Get vehicle documents
  const getDocsRes = await request(`/api/v1/vehicles/${vehicleId}/documents`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(getDocsRes.status === 200 && getDocsRes.data.some(d => d.document_id === docId), 'GET /api/v1/vehicles/:id/documents lists the uploaded document');

  // 29. Download vehicle document
  const downloadDocRes = await request(`/api/v1/vehicle-documents/${docId}/download`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(downloadDocRes.status === 200 && downloadDocRes.headers['content-disposition']?.includes('policy_contract.pdf'), 'GET /api/v1/vehicle-documents/:docId/download retrieves document stream');

  // 30. Delete vehicle document
  const deleteDocRes = await request(`/api/v1/vehicle-documents/${docId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(deleteDocRes.status === 200, 'DELETE /api/v1/vehicle-documents/:docId deletes document and removes file');

  // 31. Verify document is gone after deletion
  const getDeletedDocRes = await request(`/api/v1/vehicle-documents/${docId}/download`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(getDeletedDocRes.status === 404, 'Download deleted document returns 404');

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
