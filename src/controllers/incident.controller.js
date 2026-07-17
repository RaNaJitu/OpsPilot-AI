const asyncHandler = require("../utils/asyncHandler");
const incidentService = require("../services/incident.service");
const { BadRequestError } = require("../utils/error");
const {
  listIncidentsSchema,
  incidentIdSchema,
} = require("../validations/incident.validation");

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

exports.LIST = asyncHandler(async (req, res) => {
  const parsed = listIncidentsSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new BadRequestError(
      parsed.error.issues[0]?.message || "Invalid query parameters.",
      "INVALID_QUERY"
    );
  }

  const result = await incidentService.listIncidents({
    userId: req.user.id,
    ...parsed.data,
  });

  return res.status(200).json({
    success: true,
    message: "Incidents fetched successfully.",
    data: result.incidents,
    pagination: result.pagination,
  });
});

exports.GET_BY_ID = asyncHandler(async (req, res) => {
  const parsed = incidentIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new BadRequestError("Invalid incident id.", "INVALID_INCIDENT_ID");
  }

  const incident = await incidentService.getIncidentById({
    id: parsed.data.id,
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Incident fetched successfully.",
    data: incident,
  });
});

exports.DELETE = asyncHandler(async (req, res) => {
  const parsed = incidentIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new BadRequestError("Invalid incident id.", "INVALID_INCIDENT_ID");
  }

  await incidentService.archiveIncident({
    id: parsed.data.id,
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Incident archived successfully.",
  });
});
