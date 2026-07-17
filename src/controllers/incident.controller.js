const asyncHandler = require("../utils/asyncHandler");
const incidentService = require("../services/incident.service");
const { BadRequestError } = require("../utils/error");

exports.UPLOAD = asyncHandler(async (req, res) => {
    const { title } = req.body;

    if (!req.file) {
        throw new BadRequestError(
        "Please upload a valid log file.",
        "FILE_REQUIRED"
        );
    }

    const incident = await incidentService.uploadIncident({
        title,
        file: req.file,
        userId: req.user.id,
    });

    return res.status(201).json({
        success: true,
        message: "Incident uploaded successfully.",
        data: incident,
    });
});