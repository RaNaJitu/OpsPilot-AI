/**
 * Seed a richer incident mix for dashboard / list demos.
 *
 * Usage (from Backend/):
 *   node scripts/seed-demo-dashboard.js
 *   DEMO_USER_EMAIL=you@gmail.com node scripts/seed-demo-dashboard.js
 *
 * Creates: Critical 2 · High 4 · Medium 3 · Low 1
 */
require("dotenv/config");
const prisma = require("../src/config/prisma");

const TEMPLATES = [
  {
    title: "Redis Memory Exhaustion",
    severity: "CRITICAL",
    category: "REDIS",
    service: "redis",
    summary: "Redis hit maxmemory and began rejecting writes, cascading into session failures.",
  },
  {
    title: "API Gateway Cascade Failure",
    severity: "CRITICAL",
    category: "NETWORK",
    service: "api-gateway",
    summary: "Upstream timeouts flooded the gateway and tripped circuit breakers across services.",
  },
  {
    title: "Database Connection Pool Exhausted",
    severity: "HIGH",
    category: "DATABASE",
    service: "postgres-service",
    summary: "Connection pool exhausted due to long-running queries holding open transactions.",
  },
  {
    title: "Database Deadlock",
    severity: "HIGH",
    category: "DATABASE",
    service: "postgres-service",
    summary: "Competing transactions deadlocked on inventory rows during peak checkout traffic.",
  },
  {
    title: "Authentication Failure Spike",
    severity: "HIGH",
    category: "AUTH",
    service: "auth-service",
    summary: "Token validation errors spiked after a key rotation left stale secrets in workers.",
  },
  {
    title: "API Gateway Timeout",
    severity: "HIGH",
    category: "NETWORK",
    service: "api-gateway",
    summary: "p99 latency breached SLA as a slow dependency blocked request threads.",
  },
  {
    title: "Payment Service Crash",
    severity: "MEDIUM",
    category: "PAYMENTS",
    service: "payments",
    summary: "Payment workers crashed after a nil dereference in webhook signature verification.",
  },
  {
    title: "Kafka Consumer Lag Spike",
    severity: "MEDIUM",
    category: "MESSAGING",
    service: "kafka",
    summary: "Consumer lag grew past 15 minutes after a deploy reduced partition throughput.",
  },
  {
    title: "Pod Restart Loop in Checkout",
    severity: "MEDIUM",
    category: "COMPUTE",
    service: "checkout",
    summary: "Checkout pods entered CrashLoopBackOff due to a missing config map mount.",
  },
  {
    title: "Elevated 4xx on Search API",
    severity: "LOW",
    category: "API",
    service: "search",
    summary: "Client validation errors increased after a schema change without client rollout.",
  },
];

async function main() {
  const email = process.env.DEMO_USER_EMAIL;
  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    throw new Error(
      email
        ? `No user found for DEMO_USER_EMAIL=${email}. Sign in once, then re-run.`
        : "No users found. Sign in with Google once, then re-run this script."
    );
  }

  const titles = TEMPLATES.map((item) => item.title);

  await prisma.incident.deleteMany({
    where: {
      userId: user.id,
      OR: [
        { title: { in: titles } },
        { title: { startsWith: "[Demo Seed]" } },
        { title: { startsWith: "Test " } },
      ],
    },
  });

  const now = Date.now();

  for (let i = 0; i < TEMPLATES.length; i += 1) {
    const item = TEMPLATES[i];
    const createdAt = new Date(now - i * 36e5 * 8);

    await prisma.incident.create({
      data: {
        title: item.title,
        userId: user.id,
        status: "COMPLETED",
        severity: item.severity,
        category: item.category,
        affectedServices: [item.service],
        summary: item.summary,
        rootCause: `${item.service} hit a capacity or dependency limit that cascaded into user-facing errors.`,
        confidence: 0.86 + (i % 5) * 0.025,
        timeline: [
          { timestamp: createdAt.toISOString(), event: "First error spike detected" },
          {
            timestamp: new Date(createdAt.getTime() + 120000).toISOString(),
            event: "Service health degraded",
          },
          {
            timestamp: new Date(createdAt.getTime() + 300000).toISOString(),
            event: "Mitigation started",
          },
        ],
        evidence: [
          {
            log: `ERROR ${item.service}: resource limit exceeded`,
            explanation: "Signals capacity saturation in the affected service.",
          },
        ],
        recommendations: [
          `Scale ${item.service} and raise alert thresholds`,
          "Verify dependency SLAs and retry budgets",
        ],
        prevention: [
          `Add ${item.category.toLowerCase()} capacity dashboards`,
          "Load-test critical paths weekly",
        ],
        analyzedAt: new Date(createdAt.getTime() + 600000),
        analysisStartedAt: new Date(createdAt.getTime() + 480000),
        analysisDurationMs: 2100 + i * 120,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  console.log(`Seeded ${TEMPLATES.length} demo incidents for ${user.email}`);
  console.log("Severity mix: Critical 2 · High 4 · Medium 3 · Low 1");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
