const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth"));
router.use("/fooditem", require("./fooditem"));
router.use("/foodcategory", require("./foodcategory"));
router.use("/admin", require("./admin"));
router.use("/unit", require("./unit"));
router.use("/diet", require("./diet"));
router.use("/donation", require("./donation"));
router.use("/", require("./misc"));

module.exports = router;
