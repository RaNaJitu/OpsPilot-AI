const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const asyncHandler = require("./asyncHandler");

describe("asyncHandler", () => {
  it("invokes the wrapped async handler", async () => {
    let called = false;
    const handler = asyncHandler(async () => {
      called = true;
    });

    await handler({}, {}, () => {});
    assert.equal(called, true);
  });

  it("forwards rejected errors to next", async () => {
    const boom = new Error("fail");
    const handler = asyncHandler(async () => {
      throw boom;
    });

    const err = await new Promise((resolve) => {
      handler({}, {}, resolve);
    });

    assert.equal(err, boom);
  });
});
