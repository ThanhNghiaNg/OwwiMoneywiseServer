const categoryControllers = require("../controllers/category");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const router = express.Router();

router.post("/", isAuthUser, categoryControllers.addCategory);

router.get("/", isAuthUser, categoryControllers.getUserCategoriesV2);

router.put("/:id", isAuthUser, categoryControllers.updateCategory);

router.delete("/:id", isAuthUser, categoryControllers.deleteCategory);

module.exports = router;
