const prisma = require("../config/prisma");
const fsPromises = require("fs/promises");
const path = require("path");
const { generateChecksum } = require("../utils/checksum");
const {
  ConflictError,
  InternalServerError,
  NotFoundError,
} = require("../utils/error");

exports.uploadIncident = async ({ title, file, userId }) => {
  try {
    const checksum = await generateChecksum(file.path);

    // const existingFile = await prisma.uploadedFile.findFirst({
    //   where: {
    //     checksum,
    //     incident: {
    //       isDeleted: false,
    //     },
    //   },
    // });

    // if (existingFile) {
    //   await fsPromises.unlink(file.path).catch(() => {});

    //   throw new ConflictError(
    //     "This log file has already been uploaded.",
    //     "DUPLICATE_FILE"
    //   );
    // }

    const extension = path.extname(file.originalname).toLowerCase();

    const relativePath = path
      .relative(process.cwd(), file.path)
      .replace(/\\/g, "/");

    const incident = await prisma.$transaction(async (tx) => {
      return await tx.incident.create({
        data: {
          title,
          userId,
          files: {
            create: {
              filename: file.filename,
              originalName: file.originalname,
              extension,
              mimeType: file.mimetype,
              size: file.size,
              path: relativePath,
              checksum,
            },
          },
        },
        include: {
          files: true,
        },
      });
    });

    return incident;
  } catch (error) {
    if (file?.path) {
      await fsPromises.unlink(file.path).catch(() => {});
    }

    if (error instanceof ConflictError) {
      throw error;
    }

    throw new InternalServerError(
      "Failed to upload incident.",
      "UPLOAD_FAILED"
    );
  }
};

exports.listIncidents = async ({ userId, page, limit, search }) => {
  const where = {
    userId,
    isDeleted: false,
    ...(search
      ? {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
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

exports.getIncidentById = async ({ id, userId }) => {
  const incident = await prisma.incident.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
    },
    include: {
      files: true,
      aiResponses: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!incident) {
    throw new NotFoundError("Incident not found.", "INCIDENT_NOT_FOUND");
  }

  return incident;
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
          path: true,
        },
      },
    },
  });

  if (!incident) {
    throw new NotFoundError("Incident not found.", "INCIDENT_NOT_FOUND");
  }

  const filesToRemove = incident.files.filter((file) => file.path);

  await prisma.$transaction(async (tx) => {
    await tx.incident.update({
      where: { id: incident.id },
      data: {
        status: "ARCHIVED",
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

  });

  await Promise.all(
    filesToRemove.map((file) =>
      fsPromises.unlink(path.resolve(process.cwd(), file.path)).catch(() => {})
    )
  );

  return true;
};
