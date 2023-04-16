const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    categories: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "Category",
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamp: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
