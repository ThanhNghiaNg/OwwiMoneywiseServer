const typeController = require('../controllers/type')
const transactionController = require('../controllers/transaction')
const taskController = require('../controllers/task')

const express = require("express");
const router = express.Router();

router.get('/type/all', typeController.getAllType)

router.get('/dashboard/statistic/outcome', transactionController.getStatisticOutcome )

module.exports = router;
