const prisma = require("../config/prisma");
const logger = require("../config/logger");
const { analyzeLogs } = require("./ai.service");
const {
  NotFoundError,
  BadRequestError,
  ConflictError,
} = require("../utils/error");

const ANALYZABLE_STATUSES = ["PENDING", "FAILED", "COMPLETED"];

exports.analyzeIncident = async ({ id, userId }) => {
  const incident = await prisma.incident.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    include: {
      files: {
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  if (!incident) {
    throw new NotFoundError(
      "Incident not found.",
      "INCIDENT_NOT_FOUND"
    );
  }

  const file = incident.files[0];

  if (!file?.path) {
    throw new BadRequestError(
      "No uploaded log file found.",
      "LOG_FILE_NOT_FOUND"
    );
  }

  /**
   * Prevent concurrent analysis.
   */
  const analysisStartedAt = new Date();

  const locked = await prisma.incident.updateMany({
    where: {
      id: incident.id,
      status: {
        in: ANALYZABLE_STATUSES,
      },
    },
    data: {
      status: "ANALYZING",
      errorMessage: null,
      analysisStartedAt,
      analysisDurationMs: null,
    },
  });

  if (locked.count === 0) {
    throw new ConflictError(
      "Incident is already being analyzed.",
      "ANALYSIS_IN_PROGRESS"
    );
  }

  try {
    const { prompt, analysis, modelVersion, rawResponse } = await analyzeLogs({
      filePath: file.path,
    });

    const analysisDurationMs = Date.now() - analysisStartedAt.getTime();

    const [, updatedIncident] = await prisma.$transaction([
      prisma.aIResponse.upsert({
        where: {
          incidentId: incident.id,
        },
        update: {
          prompt,
          response: rawResponse,
          modelVersion,
        },
        create: {
          incidentId: incident.id,
          prompt,
          response: rawResponse,
          modelVersion,
        },
      }),

      prisma.incident.update({
        where: {
          id: incident.id,
        },
        data: {
          status: "COMPLETED",
          summary: analysis.summary,
          category: analysis.category,
          severity: analysis.severity,
          affectedServices: analysis.affectedServices,
          rootCause: analysis.rootCause,
          confidence: analysis.confidence,
          timeline: analysis.timeline,
          evidence: analysis.evidence,
          recommendations: analysis.recommendations,
          prevention: analysis.prevention,
          analyzedAt: new Date(),
          analysisDurationMs,
          errorMessage: null,
        },
      }),
    ]);

    return updatedIncident;
  } catch (error) {
    logger.error("AI analysis failed", {
      incidentId: incident.id,
      message: error.message,
    });

    await prisma.incident.update({
      where: {
        id: incident.id,
      },
      data: {
        status: "FAILED",
        errorMessage: error.message,
      },
    });

    throw error;
  }
};