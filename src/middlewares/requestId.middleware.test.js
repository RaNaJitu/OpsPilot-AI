const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { requestId } = require("./requestId.middleware");

describe("requestId middleware", () => {
  it("generates a request id when header is missing", () => {
    const req = { headers: {} };
    const headers = {};
    const res = {
      setHeader(key, value) {
        headers[key] = value;
      },
    };

    let nextCalled = false;
    requestId(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(typeof req.requestId === "string" && req.requestId.length > 0);
    assert.equal(headers["X-Request-Id"], req.requestId);
  });

  it("reuses inbound X-Request-Id", () => {
    const req = { headers: { "x-request-id": "client-trace-123" } };
    const headers = {};
    const res = {
      setHeader(key, value) {
        headers[key] = value;
      },
    };

    requestId(req, res, () => {});

    assert.equal(req.requestId, "client-trace-123");
    assert.equal(headers["X-Request-Id"], "client-trace-123");
  });
});
