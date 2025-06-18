const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cronLogSchema = Schema({
  path: {
    type: String,
    required: true,
  },
  status: { type: String, required: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model("CronLog", cronLogSchema);
