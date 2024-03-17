const todoController = require("../controllers/task");

const express = require("express");
const router = express.Router();

router.get("/all", todoController.getUserTodoList);
router.post("/create", todoController.postCreateTodo);
router.put("/update", todoController.putUpdateTodoStatus);
router.delete("/delete/:id", todoController.deleteTodo);
router.delete("/delete-completed", todoController.deleteCompletedTodo);

module.exports = router;
