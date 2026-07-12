-- CreateEnum
CREATE TYPE "role_name" AS ENUM ('FLEET_MANAGER', 'DRIVER_OPS', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED');

-- CreateEnum
CREATE TYPE "vehicle_type" AS ENUM ('TRUCK', 'VAN', 'BIKE', 'TRAILER');

-- CreateEnum
CREATE TYPE "driver_status" AS ENUM ('AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "trip_status" AS ENUM ('DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "maintenance_status" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "expense_type" AS ENUM ('TOLL', 'FINE', 'PARKING', 'OTHER');

-- CreateTable
CREATE TABLE "roles" (
    "role_id" SERIAL NOT NULL,
    "name" "role_name" NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable  done
CREATE TABLE "vehicles" (
    "vehicle_id" SERIAL NOT NULL,
    "registration_no" VARCHAR(30) NOT NULL,
    "name_model" VARCHAR(100) NOT NULL,
    "type" "vehicle_type" NOT NULL,
    "max_load_capacity" DECIMAL(10,2) NOT NULL,
    "odometer" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "acquisition_cost" DECIMAL(12,2) NOT NULL,
    "region" VARCHAR(60),
    "status" "vehicle_status" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("vehicle_id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "driver_id" SERIAL NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "license_number" VARCHAR(40) NOT NULL,
    "license_category" VARCHAR(20) NOT NULL,
    "license_expiry" DATE NOT NULL,
    "contact_number" VARCHAR(20) NOT NULL,
    "safety_score" DECIMAL(4,1) NOT NULL DEFAULT 100,
    "status" "driver_status" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "trips" (
    "trip_id" SERIAL NOT NULL,
    "source" VARCHAR(120) NOT NULL,
    "destination" VARCHAR(120) NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "cargo_weight" DECIMAL(10,2) NOT NULL,
    "planned_distance" DECIMAL(10,2) NOT NULL,
    "actual_distance" DECIMAL(10,2),
    "fuel_consumed" DECIMAL(10,2),
    "revenue" DECIMAL(12,2) DEFAULT 0,
    "status" "trip_status" NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER NOT NULL,
    "dispatched_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("trip_id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "maintenance_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "maintenance_status" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("maintenance_id")
);

-- CreateTable
CREATE TABLE "fuel_logs" (
    "fuel_log_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "trip_id" INTEGER,
    "liters" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL,
    "log_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("fuel_log_id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "expense_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "type" "expense_type" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(200),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("expense_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_no_key" ON "vehicles"("registration_no");

-- CreateIndex
CREATE INDEX "idx_vehicles_status" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "idx_vehicles_type_region" ON "vehicles"("type", "region");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE INDEX "idx_drivers_status" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "idx_drivers_license_expiry" ON "drivers"("license_expiry");

-- CreateIndex
CREATE INDEX "idx_trips_status" ON "trips"("status");

-- CreateIndex
CREATE INDEX "idx_trips_vehicle" ON "trips"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_trips_driver" ON "trips"("driver_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_vehicle" ON "maintenance_logs"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_maintenance_status" ON "maintenance_logs"("status");

-- CreateIndex
CREATE INDEX "idx_fuel_vehicle" ON "fuel_logs"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_expenses_vehicle" ON "expenses"("vehicle_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;
