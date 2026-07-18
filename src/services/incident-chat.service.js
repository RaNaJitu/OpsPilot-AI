const prisma = require("../config/prisma");
const openai = require("../config/openai");
const { config } = require("../config");
const { buildIncidentChatPrompt } = require("../prompts/incident-chat.prompt");
const {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} = require("../utils/error");

const HISTORY_LIMIT = 20;

const loadOwnedIncident = async ({ id, userId }) => {
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

  return incident;
};

const assertChatReady = (incident) => {
  if (incident.status !== "COMPLETED") {
    throw new BadRequestError(
      "Incident analysis must be completed before chatting.",
      "ANALYSIS_REQUIRED",
    );
  }

  if (!incident.summary && !incident.rootCause) {
    throw new BadRequestError(
      "Incident has no analysis context available for chat.",
      "ANALYSIS_CONTEXT_MISSING",
    );
  }
};

exports.listChatMessages = async ({ id, userId }) => {
  const incident = await loadOwnedIncident({ id, userId });
  assertChatReady(incident);

  return prisma.chatMessage.findMany({
    where: { incidentId: incident.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      message: true,
      createdAt: true,
    },
  });
};

exports.clearChatMessages = async ({ id, userId }) => {
  const incident = await loadOwnedIncident({ id, userId });

  await prisma.chatMessage.deleteMany({
    where: { incidentId: incident.id },
  });
};

exports.chatAboutIncident = async ({ id, userId, message }) => {
  const incident = await loadOwnedIncident({ id, userId });
  assertChatReady(incident);

  const history = await prisma.chatMessage.findMany({
    where: { incidentId: incident.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      role: true,
      message: true,
    },
  });

  history.reverse();

  const prompt = buildIncidentChatPrompt({
    incident,
    history,
    question: message,
  });

  let response;
  try {
    response = await openai.responses.create({
      model: config.OPENAI_MODEL,
      temperature: 0.3,
      instructions:
        "You are an expert SRE assistant. Answer clearly using only the provided incident context.",
      input: prompt,
    });
  } catch (error) {
    throw new InternalServerError(
      error?.message || "OpenAI request failed.",
      "AI_REQUEST_FAILED",
    );
  }

  const answer = response.output_text?.trim();
  if (!answer) {
    throw new InternalServerError(
      "AI returned an empty response.",
      "AI_EMPTY_RESPONSE",
    );
  }

  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        incidentId: incident.id,
        role: "USER",
        message,
      },
      select: {
        id: true,
        role: true,
        message: true,
        createdAt: true,
      },
    }),
    prisma.chatMessage.create({
      data: {
        incidentId: incident.id,
        role: "ASSISTANT",
        message: answer,
      },
      select: {
        id: true,
        role: true,
        message: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    answer,
    messages: [userMessage, assistantMessage],
  };
};
