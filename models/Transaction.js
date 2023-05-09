const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const transactionSchema = Schema(
  {
    type: {
      type: Schema.Types.ObjectId,
      require: true,
      ref: "Type",
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
      required: false,
    },
    date: {
      type: Date,
      required: true,
    },
    isFinished: {
      type: Boolean,
      require: true,
    },
  },
  { timestamp: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
