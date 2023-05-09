const isAuthUser = require("../middlewares/isAuthUser");
const typeController = require('../controllers/type')

const express = require("express");
const router = express.Router();

router.get('/type/all', isAuthUser, typeController.getAllType)

module.exports = router;
