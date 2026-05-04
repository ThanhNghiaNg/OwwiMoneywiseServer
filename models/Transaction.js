const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const profileSnapshotSchema = new Schema(
  {
    profileId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
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
    createdByProfile: {
      type: profileSnapshotSchema,
      required: true,
    },
  },
  { timestamp: true }
);
transactionSchema.index({ date: 1 }, { background: true });
transactionSchema.index({ user: 1 }, { background: true });
transactionSchema.index({ "createdByProfile.profileId": 1 }, { background: true });
module.exports = mongoose.model("Transaction", transactionSchema);
