const router = require("express").Router();

router.use("/auth", require("./auth.route"));
router.use("/incidents", require("./incident.routes"));
router.use("/dashboard", require("./dashboard.routes"));

module.exports = router;
