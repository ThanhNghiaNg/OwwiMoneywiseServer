const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const sixJarsController = require("../controllers/six-jars");

const router = express.Router();

router.get("/config", isAuthUser, sixJarsController.getConfig);
router.put("/config", isAuthUser, sixJarsController.upsertConfig);
router.get("/statistic/month", isAuthUser, sixJarsController.getMonthStatistic);

module.exports = router;
