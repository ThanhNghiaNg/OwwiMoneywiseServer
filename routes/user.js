const categoryControllers = require("../controllers/category");
const express = require("express");
const router = express.Router();

router.get("/categories", categoryControllers.getUserCategories);

router.post("/category/create", categoryControllers.addCategory);

router.delete("/category/remove", categoryControllers.deleteCategory);

router.put("/category/update", categoryControllers.updateCategory);

module.exports = router;
