const asyncHandler = require("../utils/asyncHandler");
const incidentService = require("../services/incident.service");
const { BadRequestError } = require("../utils/error");

exports.UPLOAD = asyncHandler(async (req, res) => {
    const { title } = req.body;

    if (!req.file) {
        throw new BadRequestError(
        "Log file is required",
        "FILE_REQUIRED"
        );
    }

    const incident = await incidentService.createIncident({
        title,
        file: req.file,
        userId: req.user.id,
    });

    return res.status(201).json({
        success: true,
        message: "Incident created successfully",
        data: incident,
    });
});