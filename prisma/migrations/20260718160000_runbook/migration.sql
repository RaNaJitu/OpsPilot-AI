-- CreateTable
CREATE TABLE "Runbook" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "estimatedResolutionTime" TEXT,
    "immediateActions" JSONB NOT NULL,
    "verificationSteps" JSONB NOT NULL,
    "rollbackPlan" JSONB NOT NULL,
    "preventionChecklist" JSONB NOT NULL,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Runbook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Runbook_incidentId_key" ON "Runbook"("incidentId");

-- AddForeignKey
ALTER TABLE "Runbook" ADD CONSTRAINT "Runbook_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
