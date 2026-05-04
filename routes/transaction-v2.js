const transactionControllers = require("../controllers/transaction");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const requireActiveProfile = require("../middlewares/requireActiveProfile");
const router = express.Router();

router.get("/", isAuthUser, requireActiveProfile, transactionControllers.getUserTransactionsV2);

router.get("/:id", isAuthUser, requireActiveProfile, transactionControllers.getUserTransactionById);

router.post("/", isAuthUser, requireActiveProfile, transactionControllers.addTransaction);

router.delete("/:id", isAuthUser, requireActiveProfile, transactionControllers.deleteTransaction);

router.put("/:id", isAuthUser, requireActiveProfile, transactionControllers.updateTransaction);

router.get("/statistic/weekly", isAuthUser, requireActiveProfile, transactionControllers.getWeeklyOutcomeComparison);

router.get("/statistic/monthly", isAuthUser, requireActiveProfile, transactionControllers.getMonthlyOutcomeComparison);

router.get("/statistic/month", isAuthUser, requireActiveProfile, transactionControllers.getMonthOutcomeStatistic);

module.exports = router;
