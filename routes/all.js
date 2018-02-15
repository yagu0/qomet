var router = require("express").Router();

// AJAX requests:
router.use("/", require("./users"));
router.use("/", require("./courses"));
router.use("/", require("./evaluations"));

// Pages:
router.use("/", require("./pages"));

module.exports = router;
