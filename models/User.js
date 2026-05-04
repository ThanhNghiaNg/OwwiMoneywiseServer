const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const profileSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = Schema(
  {
    username: { type: String, require: true },
    password: { type: String, require: true },
    fullName: { type: String, require: true },
    email: { type: String, require: true },
    phone: { type: String, require: true },
    address: { type: String, require: false },
    isAdmin: { type: Boolean, require: true },
    profiles: { type: [profileSchema], default: [] },
  },
  { timestamp: true }
);

module.exports = mongoose.model("User", userSchema);
