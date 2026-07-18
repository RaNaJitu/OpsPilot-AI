const prisma = require("../config/prisma");

const TREND_DAYS = 14;
const RECENT_LIMIT = 10;
const TOP_SERVICES_LIMIT = 5;

const emptySeverityCounts = () => ({
  CRITICAL: 0,
  HIGH: 0,
  MEDIUM: 0,
  LOW: 0,
});

const toDateKey = (value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
};

const buildTrendSeries = (rows, days) => {
  const countsByDate = new Map(
    rows.map((row) => [toDateKey(row.date), Number(row.count) || 0]),
  );

  const series = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    series.push({
      date: key,
      count: countsByDate.get(key) || 0,
    });
  }

  return series;
};

const aggregateTopServices = (incidents, limit) => {
  const counts = new Map();

  for (const incident of incidents) {
    const services = incident.affectedServices;
    if (!Array.isArray(services)) continue;

    for (const service of services) {
      if (typeof service !== "string") continue;
      const name = service.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count || a.service.localeCompare(b.service))
    .slice(0, limit);
};

exports.getDashboard = async ({ userId }) => {
  const baseWhere = {
    userId,
    isDeleted: false,
  };

  const trendStart = new Date();
  trendStart.setUTCHours(0, 0, 0, 0);
  trendStart.setUTCDate(trendStart.getUTCDate() - (TREND_DAYS - 1));

  const [
    totalIncidents,
    resolved,
    confidenceAgg,
    severityGroups,
    categoryGroups,
    trendRows,
    recentIncidents,
    serviceIncidents,
  ] = await Promise.all([
    prisma.incident.count({ where: baseWhere }),

    prisma.incident.count({
      where: {
        ...baseWhere,
        status: "COMPLETED",
      },
    }),

    prisma.incident.aggregate({
      where: {
        ...baseWhere,
        confidence: { not: null },
      },
      _avg: { confidence: true },
    }),

    prisma.incident.groupBy({
      by: ["severity"],
      where: {
        ...baseWhere,
        severity: { not: null },
      },
      _count: { _all: true },
    }),

    prisma.incident.groupBy({
      by: ["category"],
      where: {
        ...baseWhere,
        category: { not: null },
      },
      _count: { _all: true },
    }),

    prisma.$queryRaw`
      SELECT DATE("createdAt") AS date, COUNT(*)::int AS count
      FROM "Incident"
      WHERE "userId" = ${userId}
        AND "isDeleted" = false
        AND "createdAt" >= ${trendStart}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,

    prisma.incident.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        createdAt: true,
      },
    }),

    prisma.incident.findMany({
      where: {
        ...baseWhere,
        status: "COMPLETED",
      },
      select: {
        affectedServices: true,
      },
    }),
  ]);

  const severityCounts = emptySeverityCounts();
  for (const group of severityGroups) {
    if (group.severity && severityCounts[group.severity] !== undefined) {
      severityCounts[group.severity] = group._count._all;
    }
  }

  const averageConfidenceRaw = confidenceAgg._avg.confidence;
  const averageConfidence =
    averageConfidenceRaw == null
      ? 0
      : Math.round(averageConfidenceRaw * 1000) / 10;

  return {
    summary: {
      totalIncidents,
      critical: severityCounts.CRITICAL,
      high: severityCounts.HIGH,
      medium: severityCounts.MEDIUM,
      low: severityCounts.LOW,
      resolved,
      averageConfidence,
    },
    incidentTrend: buildTrendSeries(trendRows, TREND_DAYS),
    severityDistribution: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(
      (severity) => ({
        severity,
        count: severityCounts[severity],
      }),
    ),
    categoryDistribution: categoryGroups
      .map((group) => ({
        category: group.category,
        count: group._count._all,
      }))
      .sort(
        (a, b) => b.count - a.count || a.category.localeCompare(b.category),
      ),
    topAffectedServices: aggregateTopServices(
      serviceIncidents,
      TOP_SERVICES_LIMIT,
    ),
    recentIncidents,
  };
};
