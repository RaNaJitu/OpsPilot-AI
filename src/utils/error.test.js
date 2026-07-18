const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} = require("./error");

describe("AppError hierarchy", () => {
  it("BadRequestError uses 400 and custom code", () => {
    const err = new BadRequestError("bad input", "INVALID_QUERY");
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, "INVALID_QUERY");
    assert.equal(err.message, "bad input");
    assert.ok(err instanceof AppError);
    assert.ok(err instanceof Error);
  });

  it("UnauthorizedError defaults code", () => {
    const err = new UnauthorizedError("nope");
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, "UNAUTHORIZED");
  });

  it("NotFoundError and ConflictError use expected status codes", () => {
    assert.equal(new NotFoundError("missing").statusCode, 404);
    assert.equal(new ConflictError("exists").statusCode, 409);
  });
});
