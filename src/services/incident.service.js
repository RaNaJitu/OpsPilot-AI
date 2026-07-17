const prisma = require("../config/prisma");
const fs = require("fs");
const crypto = require("crypto");
const { generateChecksum } = require("../utils/checksum");

exports.uploadIncident = async ({ title, file, userId }) => {
    try {
        const checksum = await generateChecksum(file.path);

        const existingFile = await prisma.uploadedFile.findUnique({
            where: {
                checksum,
            },
        });

        if (existingFile) {
            await fsPromises.unlink(file.path).catch(() => {});

            throw new ConflictError(
                "This log file has already been uploaded.",
                "DUPLICATE_FILE"
            );
        }

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
        // Remove uploaded file if DB operation fails
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