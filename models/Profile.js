const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const profileSchema = Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    name: { type: String, required: true },
    avatarUrl: { type: String, required: false },
    color: { type: String, required: false },
    isDefault: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

profileSchema.index({ user: 1, order: 1 }, { background: true });
profileSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    background: true,
  }
);

module.exports = mongoose.model("Profile", profileSchema);
