const cronControllers = require("../controllers/cron");
const express = require("express");
const router = express.Router();

router.post("/update-most-used-category", cronControllers.updateMostUsedCategoryAndType);

module.exports = router;
