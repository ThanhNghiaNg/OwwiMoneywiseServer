const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const todoSchema = Schema({
  title: { type: String, required: true },
  status: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Todo", todoSchema);
