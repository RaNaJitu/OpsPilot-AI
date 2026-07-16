const router = require("express").Router();

router.use("/auth", require("./auth.route"));
router.use("/incidents", require("./incident.routes"));

module.exports = router;