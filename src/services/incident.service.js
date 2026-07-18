const prisma = require("../config/prisma");
const path = require("path");
const { generateChecksum } = require("../utils/checksum");
const {
  uploadIncidentFile,
  deleteIncidentFile,
} = require("./cloudinary.service");
const {
  ConflictError,
  InternalServerError,
  NotFoundError,
  BadRequestError,
} = require("../utils/error");
const logger = require("../config/logger");

exports.uploadIncident = async ({ title, file, userId }) => {
  let uploadedPublicId;
  
  try {
    if (!file?.buffer) {
      throw new BadRequestError(
        "Please upload a valid log file.",
        "FILE_REQUIRED",
      );
    }

    const checksum = generateChecksum(file.buffer);
    const extension = path.extname(file.originalname).toLowerCase();

    const cloudFile = await uploadIncidentFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
    uploadedPublicId = cloudFile.publicId;

    const filename = cloudFile.publicId.split("/").pop();

    const incident = await prisma.incident.create({
      data: {
        title,
        userId,
        files: {
          create: {
            filename,
            originalName: file.originalname,
            extension,
            mimeType: file.mimetype || cloudFile.mimeType,
            size: file.size || cloudFile.bytes,
            fileUrl: cloudFile.fileUrl,
            publicId: cloudFile.publicId,
            checksum,
          },
        },
      },
      include: {
        files: true,
      },
    });

    return incident;
  } catch (error) {
    if (uploadedPublicId) {
      await deleteIncidentFile(uploadedPublicId);
    }

    if (error instanceof ConflictError || error instanceof BadRequestError) {
      throw error;
    }

    if (error?.code === "P2002") {
      throw new ConflictError(
        "This file was already uploaded.",
        "DUPLICATE_FILE",
      );
    }

    throw new InternalServerError(
      "Failed to upload incident.",
      "UPLOAD_FAILED",
    );
  }
};

exports.listIncidents = async ({
  userId,
  page,
  limit,
  search,
  status,
  severity,
  category,
  dateFrom,
  dateTo,
}) => {
  const createdAt = {};
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!Number.isNaN(from.getTime())) {
      createdAt.gte = from;
    }
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (!Number.isNaN(to.getTime())) {
      // Inclusive end-of-day when only a date is provided (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateTo))) {
        to.setUTCHours(23, 59, 59, 999);
      }
      createdAt.lte = to;
    }
  }

  const searchTerm = typeof search === "string" ? search.trim() : "";
  const matchedSeverities = searchTerm
    ? ["LOW", "MEDIUM", "HIGH", "CRITICAL"].filter((value) =>
        value.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : [];

  const where = {
    userId,
    isDeleted: false,
    ...(searchTerm
      ? {
          OR: [
            {
              title: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            {
              summary: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            {
              category: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            {
              rootCause: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            {
              affectedService: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            // JSON array stored as text — matches service names inside the payload
            {
              affectedServices: {
                string_contains: searchTerm,
              },
            },
            {
              files: {
                some: {
                  originalName: {
                    contains: searchTerm,
                    mode: "insensitive",
                  },
                },
              },
            },
            ...(matchedSeverities.length
              ? [{ severity: { in: matchedSeverities } }]
              : []),
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(severity ? { severity } : {}),
    ...(category
      ? {
          category: {
            equals: category,
            mode: "insensitive",
          },
        }
      : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };

  const skip = (page - 1) * limit;

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        files: {
          select: {
            id: true,
            originalName: true,
            extension: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            files: true,
            aiResponses: true,
          },
        },
      },
    }),
    prisma.incident.count({ where }),
  ]);

  return {
    incidents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
};

const toAnalysisDto = (incident) => {
  if (incident.status !== "COMPLETED") {
    return null;
  }

  if (!incident.summary && !incident.rootCause) {
    return null;
  }

  return {
    summary: incident.summary,
    category: incident.category,
    severity: incident.severity,
    affectedServices: incident.affectedServices,
    rootCause: incident.rootCause,
    confidence: incident.confidence,
    timeline: incident.timeline,
    evidence: incident.evidence,
    recommendations: incident.recommendations,
    prevention: incident.prevention,
    analyzedAt: incident.analyzedAt,
    analysisDurationMs: incident.analysisDurationMs,
  };
};

const toRunbookDto = (runbook) => {
  if (!runbook) return null;

  return {
    title: runbook.title,
    estimatedResolutionTime: runbook.estimatedResolutionTime,
    immediateActions: runbook.immediateActions,
    verificationSteps: runbook.verificationSteps,
    rollbackPlan: runbook.rollbackPlan,
    preventionChecklist: runbook.preventionChecklist,
  };
};

exports.getIncidentById = async ({ id, userId }) => {
  const incident = await prisma.incident.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    include: {
      files: {
        select: {
          id: true,
          originalName: true,
          extension: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
      runbook: true,
      _count: {
        select: {
          chatMessages: true,
        },
      },
    },
  });

  if (!incident) {
    throw new NotFoundError("Incident not found.", "INCIDENT_NOT_FOUND");
  }

  const {
    summary,
    rootCause,
    confidence,
    timeline,
    evidence,
    recommendations,
    prevention,
    analyzedAt,
    analysisDurationMs,
    runbook,
    _count,
    ...incidentFields
  } = incident;

  return {
    incident: {
      ...incidentFields,
      analyzedAt,
      analysisDurationMs,
    },
    analysis: toAnalysisDto({
      status: incident.status,
      summary,
      category: incident.category,
      severity: incident.severity,
      affectedServices: incident.affectedServices,
      rootCause,
      confidence,
      timeline,
      evidence,
      recommendations,
      prevention,
      analyzedAt,
      analysisDurationMs,
    }),
    chatCount: _count.chatMessages,
    runbook: toRunbookDto(runbook),
  };
};

exports.archiveIncident = async ({ id, userId }) => {
  const incident = await prisma.incident.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    include: {
      files: {
        select: {
          id: true,
          publicId: true,
        },
      },
    },
  });

  if (!incident) {
    throw new NotFoundError("Incident not found.", "INCIDENT_NOT_FOUND");
  }

  await prisma.incident.update({
    where: { id: incident.id },
    data: {
      status: "ARCHIVED",
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  await Promise.all(
    incident.files.map((file) => deleteIncidentFile(file.publicId)),
  );

  return true;
};
