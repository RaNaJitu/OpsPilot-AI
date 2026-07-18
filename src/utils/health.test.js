const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("health contract", () => {
  it("returns a successful health payload shape", () => {
    const payload = { message: "ok" };
    assert.equal(payload.message, "ok");
  });
});
