# TransitOps Backend

TransitOps is a Smart Transport Operations Platform built with Node.js, Express, PostgreSQL, and Prisma.

## Setup Instructions

### Prerequisites
- Node.js (LTS version recommended)
- PostgreSQL database running locally

### Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration
Create a `.env` file in the root of the `backend` directory (using `.env.example` as a template):
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/transitops?schema=public"
JWT_SECRET="YOUR_JWT_SECRET_KEY"
FRONTEND_URL="http://localhost:3000"
PORT=3000
NODE_ENV="development"
```

### Database Migration & Seeding
1. Run migrations to create the database schema:
   ```bash
   npm run db:migrate
   ```
2. Seed the database with demo operational data:
   ```bash
   npm run db:seed
   ```

### Running the App
- Run in development mode (with hot reloading):
  ```bash
  npm run dev
  ```
- Run in production mode:
  ```bash
  npm start
  ```

### Running Integration Tests
To execute the test suite (uses `jest` and `supertest` to test business logic and concurrency):
```bash
npm test
```

---

## API Lifecycle Demo Walkthrough (CURL)

This walkthrough demonstrates the trip lifecycle from registration/login to creation, dispatch, and completion.

### 1. Register & Login

Register a Fleet Manager user:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Devang Patel", "email": "devang@transitops.com", "password": "Passw0rd!", "role": "FLEET_MANAGER"}'
```

Log in to receive your JWT token:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "devang@transitops.com", "password": "Passw0rd!"}'
```
*Note: Copy the `token` value from the JSON response to use in the `Authorization: Bearer <TOKEN>` header for the next requests.*

### 2. Create a Trip (DRAFT)

Create a trip draft assigning `Van-05` (ID 1) and driver `Alex Carter` (ID 1):
```bash
curl -X POST http://localhost:3000/api/v1/trips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"source": "Main Depot", "destination": "Retail Outlet 2", "vehicle_id": 1, "driver_id": 1, "cargo_weight": 350, "planned_distance": 95.5}'
```

### 3. Dispatch the Trip

Start the trip, flipping the vehicle and driver status to `ON_TRIP` atomically:
```bash
curl -X POST http://localhost:3000/api/v1/trips/4/dispatch \
  -H "Authorization: Bearer <TOKEN>"
```

### 4. Complete the Trip

Finish the trip, calculating final mileage, logging fuel, and releasing both vehicle and driver to `AVAILABLE` status:
```bash
curl -X POST http://localhost:3000/api/v1/trips/4/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"final_odometer": 12096, "fuel_consumed": 12, "revenue": 550}'
```
