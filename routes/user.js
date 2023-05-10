const isAuthUser = require("../middlewares/isAuthUser");
const typeController = require('../controllers/type')
const transactionController = require('../controllers/transaction')

const express = require("express");
const router = express.Router();

router.get('/type/all', isAuthUser, typeController.getAllType)

router.get('/dashboard/statistic/outcome', isAuthUser,transactionController.getStatisticOutcome )

module.exports = router;
