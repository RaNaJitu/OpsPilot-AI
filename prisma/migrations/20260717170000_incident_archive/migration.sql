-- AlterEnum
ALTER TYPE "IncidentStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UploadedFile" ALTER COLUMN "path" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Incident_isDeleted_idx" ON "Incident"("isDeleted");

