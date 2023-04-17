const categoryControllers = require("../controllers/category");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const router = express.Router();

router.get("/all", isAuthUser, categoryControllers.getUserCategories);

router.post("/create", isAuthUser, categoryControllers.addCategory);

router.delete("/remove", isAuthUser, categoryControllers.deleteCategory);

router.put("/update", isAuthUser, categoryControllers.updateCategory);

module.exports = router;
