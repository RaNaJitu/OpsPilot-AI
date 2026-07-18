const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const { GET_DASHBOARD } = require("../controllers/dashboard.controller");

router.get("/", authenticate, GET_DASHBOARD);

module.exports = router;
