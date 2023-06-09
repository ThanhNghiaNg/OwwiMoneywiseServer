const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = Schema({
  name: {
    type: String,
    required: true,
  },
  user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  type: { type: Schema.Types.ObjectId, required: true, ref: "Type" },
});

module.exports = mongoose.model("Category", categorySchema);
