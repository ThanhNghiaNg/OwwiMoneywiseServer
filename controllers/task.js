const Todo = require("../models/Todo");

exports.getUserTodoList = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const todoList = await Todo.find({ user: userId }).sort({
      createdDate: -1,
    });
    const transformedTodoList =
      todoList.map((task) => {
        return {
          id: task._id,
          title: task.title,
          status: task.status,
        };
      }) || [];
    return res.send(transformedTodoList);
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.postCreateTodo = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const title = req.body.title;
    const todo = new Todo({
      title,
      status: "incomplete",
      user: userId,
    });

    return todo.save().then((todo) => {
      return res.send({
        id: todo._id,
        title: todo.title,
        status: todo.status,
      });
    });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.putUpdateTodoStatus = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { id, status } = req.body;
    const todo = await Todo.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { status } }
    );
    console.log({ todo, id, status });
    return res.send({ message: "Update successfully!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.deleteTodo = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const id = req.params.id;
    await Todo.findOneAndDelete({ _id: id, user: userId });
    return res.send({ message: "Delete successfully!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};
