const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSessionSchema = Schema(
  {
    _id: String,
    expires: { type: String, require: true },
    session: {
      sessionID: { type: String, require: true },
      cookie: {
        originalMaxAge: { type: Number, require: false },
        expires: { type: String, require: false },
        secure: { type: Boolean, require: false },
        httpOnly: { type: Boolean, require: false },
        domain: { type: String, require: false },
        path: { type: String, require: false },
        sameSite: { type: String | Boolean, require: false },
      },
      isLoggedIn: { type: Boolean, require: false },
      user: {},
    },
  },
  { timestamp: true }
);

module.exports = mongoose.model("UserSession", userSessionSchema);
