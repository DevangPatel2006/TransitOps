-- CreateEnum
CREATE TYPE "doc_type" AS ENUM ('INSURANCE', 'RC', 'PERMIT', 'PUC', 'OTHER');

-- CreateTable
CREATE TABLE "license_reminder_logs" (
    "reminder_id" SERIAL NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "days_before" INTEGER NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_reminder_logs_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "document_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "doc_type" "doc_type" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("document_id")
);

-- AddForeignKey
ALTER TABLE "license_reminder_logs" ADD CONSTRAINT "license_reminder_logs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE;
