const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const typeSchema = Schema({
  name: { type: String, require: true },
  description: { type: String, require: false },
  user: { type: Schema.Types.ObjectId, require: true, ref: "User" },
});

module.exports = mongoose.model("Type", typeSchema);
