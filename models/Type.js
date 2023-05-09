const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const typeSchema = Schema({
  name: { type: String, require: true },
  description: { type: String, require: false },
  user: { type: Schema.Types.ObjectId, require: true, ref: "User" },
});

typeSchema.methods.createDefaultInComeType = function (userId) {
  this.name = "Income";
  this.description = "Income is the money that you obtain from others.";
  this.user = mongoose.SchemaType.ObjectId(userId);
  return this.save();
};

typeSchema.methods.createDefaultOutcomeType = function (userId) {
  this.name = "Outcome";
  this.description = "Outcome is the money that you give to others to exchange something.";
  this.user = mongoose.SchemaType.ObjectId(userId);
  return this.save();
};

module.exports = mongoose.model("Type", typeSchema);
