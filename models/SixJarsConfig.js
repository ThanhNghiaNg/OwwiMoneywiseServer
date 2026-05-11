const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const sixJarItemSchema = Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    plannedAmount: { type: Number, required: true },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category", required: true }],
  },
  { _id: false }
);

const sixJarsConfigSchema = Schema(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: "User", unique: true },
    jars: {
      type: [sixJarItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 6,
        message: "Six jars config must contain exactly 6 jars!",
      },
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

sixJarsConfigSchema.index({ user: 1 }, { unique: true, background: true });

module.exports = mongoose.model("SixJarsConfig", sixJarsConfigSchema);
