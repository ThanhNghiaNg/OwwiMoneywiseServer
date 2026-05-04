const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const createdByProfileSchema = Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true, ref: "Profile" },
    name: { type: String, required: true },
    avatarUrl: { type: String, required: false },
    color: { type: String, required: false },
  },
  { _id: false }
);

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
    createdByProfile: {
      type: createdByProfileSchema,
      required: false,
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
    isDone: {
      type: Boolean,
      require: true,
    },
  },
  { timestamp: true }
);
transactionSchema.index({ date: 1 }, { background: true});
transactionSchema.index({ user: 1 }, { background: true});
module.exports = mongoose.model("Transaction", transactionSchema);
