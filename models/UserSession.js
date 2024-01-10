const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSessionSchema = Schema(
  {
    expires: { type: String, require: true },
    session: {
      cookie: {
        originalMaxAge: Number,
        expires: String,
        secure: Boolean,
        httpOnly: Boolean,
        domain: String,
        path: String,
        sameSite: String | Boolean,
      },
      isLoggedIn: Boolean,
      user: {},
    },
  },
  { timestamp: true }
);

module.exports = mongoose.model("UserSession", userSessionSchema);
