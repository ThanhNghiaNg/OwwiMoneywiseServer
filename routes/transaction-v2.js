const transactionControllers = require("../controllers/transaction");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const requireActiveProfile = require("../middlewares/requireActiveProfile");
const router = express.Router();

router.get("/", isAuthUser, transactionControllers.getUserTransactionsV2);

router.get("/:id", isAuthUser, transactionControllers.getUserTransactionById);

router.post("/", isAuthUser, requireActiveProfile, transactionControllers.addTransaction);

router.delete("/:id", isAuthUser, transactionControllers.deleteTransaction);

router.put("/:id", isAuthUser, transactionControllers.updateTransaction);

router.get("/statistic/weekly", isAuthUser, transactionControllers.getWeeklyOutcomeComparison);

router.get("/statistic/monthly", isAuthUser, transactionControllers.getMonthlyOutcomeComparison);

router.get("/statistic/month", isAuthUser, transactionControllers.getMonthOutcomeStatistic);

module.exports = router;
