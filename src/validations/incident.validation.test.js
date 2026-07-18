const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  listIncidentsSchema,
  incidentIdSchema,
  createIncidentSchema,
} = require("../validations/incident.validation");

describe("incident validation", () => {
  it("listIncidentsSchema applies defaults", () => {
    const parsed = listIncidentsSchema.safeParse({});
    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.data, { page: 1, limit: 10, search: "" });
  });

  it("listIncidentsSchema coerces page/limit and trims search", () => {
    const parsed = listIncidentsSchema.safeParse({
      page: "2",
      limit: "5",
      search: "  redis  ",
    });
    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.data, { page: 2, limit: 5, search: "redis" });
  });

  it("listIncidentsSchema rejects invalid limit", () => {
    const parsed = listIncidentsSchema.safeParse({ limit: 100 });
    assert.equal(parsed.success, false);
  });

  it("incidentIdSchema accepts cuid", () => {
    const parsed = incidentIdSchema.safeParse({
      id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    assert.equal(parsed.success, true);
  });

  it("incidentIdSchema rejects non-cuid", () => {
    const parsed = incidentIdSchema.safeParse({ id: "not-a-cuid" });
    assert.equal(parsed.success, false);
  });

  it("createIncidentSchema enforces title length", () => {
    assert.equal(createIncidentSchema.safeParse({ title: "ab" }).success, false);
    assert.equal(
      createIncidentSchema.safeParse({ title: "Outage in Redis" }).success,
      true
    );
  });
});
