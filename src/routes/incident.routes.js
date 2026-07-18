const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const uploadMiddleware = require("../middlewares/upload.middleware");
const {
  uploadLimiter,
  analyzeLimiter,
  chatLimiter,
  runbookLimiter,
} = require("../middlewares/rateLimit.middleware");
const {
  UPLOAD,
  LIST,
  GET_BY_ID,
  DELETE,
  ANALYZE,
  LIST_CHAT,
  CHAT,
  DELETE_CHAT,
  GENERATE_RUNBOOK,
} = require("../controllers/incident.controller");

router.get("/", authenticate, LIST);
router.post(
  "/upload",
  authenticate,
  uploadLimiter,
  uploadMiddleware.single("file"),
  UPLOAD,
);
router.post("/:id/analyze", authenticate, analyzeLimiter, ANALYZE);
router.get("/:id/chat", authenticate, LIST_CHAT);
router.post("/:id/chat", authenticate, chatLimiter, CHAT);
router.delete("/:id/chat", authenticate, DELETE_CHAT);
router.post("/:id/runbook", authenticate, runbookLimiter, GENERATE_RUNBOOK);
router.get("/:id", authenticate, GET_BY_ID);
router.delete("/:id", authenticate, DELETE);

module.exports = router;
