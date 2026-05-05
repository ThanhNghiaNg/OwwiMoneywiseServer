const transactionControllers = require("../controllers/transaction");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const requireActiveProfile = require("../middlewares/requireActiveProfile");
const router = express.Router();

router.post("/all", isAuthUser, requireActiveProfile, transactionControllers.getUserTransactions);

router.get("/:id", isAuthUser, requireActiveProfile, transactionControllers.getUserTransactionById);

router.post("/create", isAuthUser, requireActiveProfile, transactionControllers.addTransaction);

router.delete(
  "/delete/:id",
  isAuthUser,
  requireActiveProfile,
  transactionControllers.deleteTransaction
);

router.put("/update/:id", isAuthUser, requireActiveProfile, transactionControllers.updateTransaction);

module.exports = router;
