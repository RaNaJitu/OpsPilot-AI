const prisma = require("../config/prisma");

exports.createIncident = async ({
    title,
    file,
    userId,
}) => {
    return await prisma.incident.create({
        data: {
        title,
        status: "UPLOADED",

        user: {
            connect: {
            id: userId,
            },
        },

        files: {
            create: {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            path: file.path,
            size: file.size,
            },
        },
        },

        include: {
        files: true,
        },
    });
};