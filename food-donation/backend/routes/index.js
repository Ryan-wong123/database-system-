const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth"));
router.use("/fooditem", require("./fooditem"));
router.use("/foodcategory", require("./foodcategory"));
router.use("/admin", require("./admin"));
router.use("/", require("./misc"));
router.use("/donations", require("./donation"));
router.use("/diet", require("./diet"));

module.exports = router;
