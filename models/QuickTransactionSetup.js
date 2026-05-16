const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const quickTransactionSetupSchema = Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    createdByProfile: {
      _id: { type: Schema.Types.ObjectId, required: true, ref: "Profile" },
      name: { type: String, required: true },
      avatarUrl: { type: String, required: false },
      color: { type: String, required: false },
    },
    title: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true, default: "#0EA5E9" },
    type: { type: Schema.Types.ObjectId, required: true, ref: "Type" },
    partner: { type: Schema.Types.ObjectId, required: true, ref: "Partner" },
    category: { type: Schema.Types.ObjectId, required: true, ref: "Category" },
    amount: { type: Number, required: true },
    description: { type: String, required: false, default: "" },
  },
  { timestamps: true }
);

quickTransactionSetupSchema.index({ user: 1, "createdByProfile._id": 1 }, { background: true });
quickTransactionSetupSchema.index({ user: 1, title: 1 }, { background: true });

module.exports = mongoose.model("QuickTransactionSetup", quickTransactionSetupSchema);
