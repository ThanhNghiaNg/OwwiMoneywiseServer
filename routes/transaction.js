const transactionControllers = require("../controllers/transaction");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const router = express.Router();

router.post("/all", isAuthUser, transactionControllers.getUserTransactions);

router.get("/:id", isAuthUser, transactionControllers.getUserTransactionById);

router.post("/create", isAuthUser, transactionControllers.addTransaction);

router.delete(
  "/delete/:id",
  isAuthUser,
  transactionControllers.deleteTransaction
);

router.put("/update/:id", isAuthUser, transactionControllers.updateTransaction);

module.exports = router;
