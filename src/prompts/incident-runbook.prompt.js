const formatJsonList = (value, emptyLabel = "None") => {
  if (value == null) return emptyLabel;
  if (typeof value === "string") return value || emptyLabel;
  if (Array.isArray(value)) {
    if (value.length === 0) return emptyLabel;
    return value
      .map((item) => {
        if (typeof item === "string") return `- ${item}`;
        if (item && typeof item === "object") {
          if (item.timestamp !== undefined && item.event !== undefined) {
            return `- [${item.timestamp ?? "unknown"}] ${item.event}`;
          }
          if (item.log !== undefined && item.explanation !== undefined) {
            return `- ${item.log}\n  Explanation: ${item.explanation}`;
          }
          return `- ${JSON.stringify(item)}`;
        }
        return `- ${String(item)}`;
      })
      .join("\n");
  }
  return JSON.stringify(value, null, 2);
};

/**
 * Build a runbook prompt from structured incident analysis.
 * Avoids re-sending raw log files.
 */
exports.buildIncidentRunbookPrompt = (incident) => {
  return `
You are an expert Site Reliability Engineer writing an operational runbook for a production incident.

Use ONLY the structured incident analysis below. Do not invent unsupported facts.

IMPORTANT RULES:
1. Return ONLY a single valid JSON object.
2. Do NOT use markdown.
3. Do NOT wrap the response in code fences.
4. Do NOT include any text before or after the JSON.
5. Keep steps concrete, ordered, and actionable for an on-call engineer.
6. Prefer short imperative steps.
7. estimatedResolutionTime should be a human-readable range (e.g. "10-15 minutes").

Return this JSON schema exactly:

{
  "title": "string",
  "estimatedResolutionTime": "string",
  "immediateActions": ["string"],
  "verificationSteps": ["string"],
  "rollbackPlan": ["string"],
  "prevention": ["string"]
}

Field requirements:
- title: concise runbook title based on the incident
- estimatedResolutionTime: realistic time range to stabilize the incident
- immediateActions: 3-7 steps to mitigate/resolve now
- verificationSteps: 2-5 steps to confirm recovery
- rollbackPlan: 1-5 steps if mitigation fails or needs undo
- prevention: 2-5 longer-term prevention checklist items

Incident Title:
${incident.title || "Untitled"}

Severity:
${incident.severity || "Unknown"}

Category:
${incident.category || "Unknown"}

Summary:
${incident.summary || "Unknown"}

Root Cause:
${incident.rootCause || "Unknown"}

Timeline:
${formatJsonList(incident.timeline)}

Evidence:
${formatJsonList(incident.evidence)}

Recommendations:
${formatJsonList(incident.recommendations)}

Prevention (from analysis):
${formatJsonList(incident.prevention)}
`.trim();
};
