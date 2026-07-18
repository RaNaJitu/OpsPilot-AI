const { z } = require("zod");

exports.createIncidentSchema = z.object({
  title: z.string().trim().min(3).max(150),
});

const emptyToUndefined = (value) =>
  value === "" || value === null || value === undefined ? undefined : value;

exports.listIncidentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(150).optional().default(""),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(["PENDING", "ANALYZING", "COMPLETED", "FAILED", "ARCHIVED"]).optional(),
  ),
  severity: z.preprocess(
    emptyToUndefined,
    z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  ),
  category: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(100).optional(),
  ),
  dateFrom: z.preprocess(emptyToUndefined, z.string().date().optional()),
  dateTo: z.preprocess(emptyToUndefined, z.string().date().optional()),
});

exports.incidentIdSchema = z.object({
  id: z.string().cuid(),
});

exports.chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(2000, "Message must be at most 2000 characters."),
});
