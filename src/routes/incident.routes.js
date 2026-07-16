const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { VERIFY_GOOGLE_ID_TOKEN } = require('../controllers/auth.controller');


router.get("/", VERIFY_GOOGLE_ID_TOKEN);
router.post("/:id", VERIFY_GOOGLE_ID_TOKEN);
router.post("/upload", VERIFY_GOOGLE_ID_TOKEN);
router.delete("/:id", authenticate, VERIFY_GOOGLE_ID_TOKEN);
router.delete("/:id/analyze", authenticate, VERIFY_GOOGLE_ID_TOKEN);
module.exports = router;