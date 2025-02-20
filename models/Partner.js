const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const partnerSchema = Schema({
  user: { type: Schema.Types.ObjectId, require: true, ref: "User" },
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: false,
  },
  type: { type: Schema.Types.ObjectId, required: true, ref: "Type" },
  usedTime: { type: Number, default: 0 },
});

module.exports = mongoose.model("Partner", partnerSchema);
