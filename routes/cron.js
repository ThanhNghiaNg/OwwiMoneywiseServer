const cronControllers = require("../controllers/cron");
const express = require("express");
const router = express.Router();

router.get("/update-most-used-category", cronControllers.updateMostUsedCategoryAndType);

module.exports = router;
