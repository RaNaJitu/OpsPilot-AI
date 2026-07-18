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
 * Build a chat prompt from structured incident analysis + conversation history.
 * Avoids re-sending raw log files.
 */
exports.buildIncidentChatPrompt = ({ incident, history = [], question }) => {
  const historyBlock =
    history.length === 0
      ? "None yet."
      : history
          .map((msg) => {
            const label = msg.role === "USER" ? "User" : "Assistant";
            return `${label}: ${msg.message}`;
          })
          .join("\n\n");

  return `
You are an SRE assistant helping an engineer understand a specific production incident.

Rules:
1. Answer ONLY using the incident context and conversation history below.
2. Do not invent facts that are not supported by the context.
3. If something is unknown or missing from the analysis, say so clearly.
4. Keep answers practical, concise, and actionable.
5. Prefer plain language suitable for on-call engineers.

Incident Title:
${incident.title || "Untitled"}

Severity:
${incident.severity || "Unknown"}

Category:
${incident.category || "Unknown"}

Incident Summary:
${incident.summary || "Unknown"}

Root Cause:
${incident.rootCause || "Unknown"}

Affected Services:
${formatJsonList(incident.affectedServices)}

Timeline:
${formatJsonList(incident.timeline)}

Evidence:
${formatJsonList(incident.evidence)}

Recommendations:
${formatJsonList(incident.recommendations)}

Prevention:
${formatJsonList(incident.prevention)}

Conversation History:
${historyBlock}

User Question:
${question}
`.trim();
};
