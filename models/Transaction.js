const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },
    user: { type: Schema.Types.ObjectId, require: true, ref: "User" },
    partner: { type: Schema.Types.ObjectId, require: true, ref: "Partner" },
    category: {
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
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamp: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
