const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const requireActiveProfile = require("../middlewares/requireActiveProfile");
const quickTransactionSetupControllers = require("../controllers/quick-transaction-setup");

const router = express.Router();

router.get("/", isAuthUser, requireActiveProfile, quickTransactionSetupControllers.getQuickTransactionSetups);
router.get("/:id", isAuthUser, requireActiveProfile, quickTransactionSetupControllers.getQuickTransactionSetupById);
router.post("/", isAuthUser, requireActiveProfile, quickTransactionSetupControllers.createQuickTransactionSetup);
router.put("/:id", isAuthUser, requireActiveProfile, quickTransactionSetupControllers.updateQuickTransactionSetup);
router.delete("/:id", isAuthUser, requireActiveProfile, quickTransactionSetupControllers.deleteQuickTransactionSetup);

module.exports = router;
