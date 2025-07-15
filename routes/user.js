const typeController = require('../controllers/type')
const transactionController = require('../controllers/transaction')
const userController = require('../controllers/user')

const express = require("express");
const router = express.Router();

router.get('/type/all', typeController.getAllType)

router.get('/dashboard/statistic/outcome', transactionController.getStatisticOutcome )

router.get('/', userController.getUserInfo )

router.put('/', userController.updateUserInfo )

router.post('/update-password', userController.updatePassword )

module.exports = router;
