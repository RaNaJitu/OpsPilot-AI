-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('PENDING', 'ANALYZING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "AIResponse" ADD COLUMN     "modelVersion" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "affectedService" TEXT,
ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "evidence" JSONB,
ADD COLUMN     "prevention" JSONB,
ADD COLUMN     "recommendations" JSONB,
ADD COLUMN     "timeline" JSONB,
DROP COLUMN "severity",
ADD COLUMN     "severity" "Severity",
DROP COLUMN "status",
ADD COLUMN     "status" "IncidentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "extension" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Incident_userId_idx" ON "Incident"("userId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_createdAt_idx" ON "Incident"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_checksum_key" ON "UploadedFile"("checksum");

-- CreateIndex
CREATE INDEX "UploadedFile_incidentId_idx" ON "UploadedFile"("incidentId");

