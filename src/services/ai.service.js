const fsPromises = require("fs/promises");
const path = require("path");
const { z } = require("zod");
const openai = require("../config/openai");
const { config } = require("../config");
const { buildIncidentAnalysisPrompt } = require("../prompts/incident.prompt");
const { BadRequestError, InternalServerError } = require("../utils/error");

const timelineSchema = z.object({
  timestamp: z.string().nullable(),
  event: z.string(),
});

const evidenceSchema = z.object({
  log: z.string(),
  explanation: z.string(),
});

const analysisResultSchema = z.object({
  summary: z.string().min(1),
  category: z
    .enum([
      "DATABASE",
      "APPLICATION",
      "NETWORK",
      "KUBERNETES",
      "DOCKER",
      "REDIS",
      "NGINX",
      "MEMORY",
      "CPU",
      "DISK",
      "SECURITY",
      "UNKNOWN",
    ])
    .default("UNKNOWN"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  affectedServices: z.array(z.string()).default([]),
  rootCause: z.string().min(1),
  confidence: z.number().min(0).max(1),
  timeline: z.array(timelineSchema),
  evidence: z.array(evidenceSchema),
  recommendations: z.array(z.string()),
  prevention: z.array(z.string()),
});

const readAndPrepareLogFile = async (filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const content = await fsPromises.readFile(absolutePath, "utf8");

  if (!content.trim()) {
    throw new BadRequestError("Log file is empty.", "EMPTY_LOG_FILE");
  }

  if (content.length > config.OPENAI_MAX_LOG_CHARS) {
    return `${content.slice(0, config.OPENAI_MAX_LOG_CHARS)}\n\n[TRUNCATED]`;
  }

  return content;
};

const parseAndValidate = (raw) => {
  let parsed;

  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new InternalServerError(
      "AI returned invalid JSON.",
      "AI_INVALID_JSON"
    );
  }

  const result = analysisResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new InternalServerError(
      "AI response failed schema validation.",
      "AI_SCHEMA_INVALID"
    );
  }

  return result.data;
};

/**
 * AI-only workflow: read logs → prompt → OpenAI → parse/validate → return.
 * No database writes here.
 */
exports.analyzeLogs = async ({ filePath }) => {
  const logs = await readAndPrepareLogFile(filePath);
  const prompt = buildIncidentAnalysisPrompt(logs);

  let response;
  try {
    response = await openai.responses.create({
      model: config.OPENAI_MODEL,
      temperature: 0.2,
      instructions:
        "You are an expert SRE incident analyst. Respond with valid JSON only.",
      input: prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
    });
  } catch (error) {
    throw new InternalServerError(
      error?.message || "OpenAI request failed.",
      "AI_REQUEST_FAILED"
    );
  }

  const rawContent = response.output_text;
  if (!rawContent) {
    throw new InternalServerError(
      "AI returned an empty response.",
      "AI_EMPTY_RESPONSE"
    );
  }

  const analysis = parseAndValidate(rawContent);

  return {
    prompt,
    analysis,
    modelVersion: response.model || config.OPENAI_MODEL,
    rawResponse: analysis,
  };
};
