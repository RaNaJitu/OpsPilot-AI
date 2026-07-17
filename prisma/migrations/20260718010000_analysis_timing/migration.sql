-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "analysisDurationMs" INTEGER,
ADD COLUMN     "analysisStartedAt" TIMESTAMP(3);
