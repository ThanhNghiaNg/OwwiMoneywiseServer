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
  age: {
    type: Number,
    required: false,
  },
});

module.exports = mongoose.model("Partner", partnerSchema);
