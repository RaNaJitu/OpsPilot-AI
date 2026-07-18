const asyncHandler = require("../utils/asyncHandler");
const incidentService = require("../services/incident.service");
const incidentAnalysisService = require("../services/incident-analysis.service");
const incidentChatService = require("../services/incident-chat.service");
const incidentRunbookService = require("../services/incident-runbook.service");
const { BadRequestError } = require("../utils/error");
const {
  listIncidentsSchema,
  incidentIdSchema,
  chatMessageSchema,
} = require("../validations/incident.validation");

exports.UPLOAD = asyncHandler(async (req, res) => {
  const { title } = req.body;

  if (!req.file) {
    throw new BadRequestError(
      "Please upload a valid log file.",
      "FILE_REQUIRED",
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
      "INVALID_QUERY",
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

exports.ANALYZE = asyncHandler(async (req, res) => {
  const parsed = incidentIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new BadRequestError("Invalid incident id.", "INVALID_INCIDENT_ID");
  }
  const result = await incidentAnalysisService.analyzeIncident({
    id: parsed.data.id,
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Incident analyzed successfully.",
    data: result,
  });
});

exports.LIST_CHAT = asyncHandler(async (req, res) => {
  const parsed = incidentIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new BadRequestError("Invalid incident id.", "INVALID_INCIDENT_ID");
  }

  const messages = await incidentChatService.listChatMessages({
    id: parsed.data.id,
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Chat history fetched successfully.",
    data: messages,
  });
});

exports.CHAT = asyncHandler(async (req, res) => {
  const parsedParams = incidentIdSchema.safeParse(req.params);
  if (!parsedParams.success) {
    throw new BadRequestError("Invalid incident id.", "INVALID_INCIDENT_ID");
  }

  const parsedBody = chatMessageSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new BadRequestError(
      parsedBody.error.issues[0]?.message || "Invalid chat message.",
      "INVALID_CHAT_MESSAGE",
    );
  }

  const result = await incidentChatService.chatAboutIncident({
    id: parsedParams.data.id,
    userId: req.user.id,
    message: parsedBody.data.message,
  });

  return res.status(200).json({
    success: true,
    message: "Chat reply generated.",
    data: result,
  });
});

exports.DELETE_CHAT = asyncHandler(async (req, res) => {
  const parsed = incidentIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new BadRequestError("Invalid incident id.", "INVALID_INCIDENT_ID");
  }

  await incidentChatService.clearChatMessages({
    id: parsed.data.id,
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Chat history cleared successfully.",
  });
});

exports.GENERATE_RUNBOOK = asyncHandler(async (req, res) => {
  const parsed = incidentIdSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new BadRequestError("Invalid incident id.", "INVALID_INCIDENT_ID");
  }

  const runbook = await incidentRunbookService.generateIncidentRunbook({
    id: parsed.data.id,
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Runbook generated successfully.",
    data: runbook,
  });
});
