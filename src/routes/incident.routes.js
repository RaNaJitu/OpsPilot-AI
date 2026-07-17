const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const uploadMiddleware = require("../middlewares/upload.middleware");
const {
  UPLOAD,
  LIST,
  GET_BY_ID,
  DELETE,
  ANALYZE,
} = require("../controllers/incident.controller");

router.get("/", authenticate, LIST);
router.post("/upload", authenticate, uploadMiddleware.single("file"), UPLOAD);
router.post("/:id/analyze", authenticate, ANALYZE);
router.get("/:id", authenticate, GET_BY_ID);
router.delete("/:id", authenticate, DELETE);

module.exports = router;
