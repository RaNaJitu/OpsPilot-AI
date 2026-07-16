const { z } = require("zod");

exports.createIncidentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3)
    .max(150),
});