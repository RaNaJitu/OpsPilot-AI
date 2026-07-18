const prisma = require("../config/prisma");
const { generateRunbook } = require("./ai.service");
const { NotFoundError, BadRequestError } = require("../utils/error");

const toRunbookResponse = (runbook) => ({
  id: runbook.id,
  incidentId: runbook.incidentId,
  title: runbook.title,
  estimatedResolutionTime: runbook.estimatedResolutionTime,
  immediateActions: runbook.immediateActions,
  verificationSteps: runbook.verificationSteps,
  rollbackPlan: runbook.rollbackPlan,
  prevention: runbook.preventionChecklist,
  modelVersion: runbook.modelVersion,
  createdAt: runbook.createdAt,
  updatedAt: runbook.updatedAt,
});

exports.generateIncidentRunbook = async ({ id, userId }) => {
  const incident = await prisma.incident.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
  });

  if (!incident) {
    throw new NotFoundError("Incident not found.", "INCIDENT_NOT_FOUND");
  }

  if (incident.status !== "COMPLETED") {
    throw new BadRequestError(
      "Incident analysis must be completed before generating a runbook.",
      "ANALYSIS_REQUIRED",
    );
  }

  if (!incident.summary && !incident.rootCause) {
    throw new BadRequestError(
      "Incident has no analysis context available for runbook generation.",
      "ANALYSIS_CONTEXT_MISSING",
    );
  }

  const { runbook, modelVersion } = await generateRunbook({ incident });

  const saved = await prisma.runbook.upsert({
    where: { incidentId: incident.id },
    update: {
      title: runbook.title,
      estimatedResolutionTime: runbook.estimatedResolutionTime,
      immediateActions: runbook.immediateActions,
      verificationSteps: runbook.verificationSteps,
      rollbackPlan: runbook.rollbackPlan,
      preventionChecklist: runbook.prevention,
      modelVersion,
    },
    create: {
      incidentId: incident.id,
      title: runbook.title,
      estimatedResolutionTime: runbook.estimatedResolutionTime,
      immediateActions: runbook.immediateActions,
      verificationSteps: runbook.verificationSteps,
      rollbackPlan: runbook.rollbackPlan,
      preventionChecklist: runbook.prevention,
      modelVersion,
    },
  });

  return toRunbookResponse(saved);
};
