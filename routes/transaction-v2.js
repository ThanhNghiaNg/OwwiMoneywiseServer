const transactionControllers = require("../controllers/transaction");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const router = express.Router();

router.get("/", isAuthUser, transactionControllers.getUserTransactionsV2);

router.get("/:id", isAuthUser, transactionControllers.getUserTransactionById);

router.post("/", isAuthUser, transactionControllers.addTransaction);

router.delete("/:id", isAuthUser, transactionControllers.deleteTransaction);

router.put("/:id", isAuthUser, transactionControllers.updateTransaction);

module.exports = router;
