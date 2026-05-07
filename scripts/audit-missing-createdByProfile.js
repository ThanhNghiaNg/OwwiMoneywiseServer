require("dotenv").config();

const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");

const MONGO_URI = process.env.MONGO_URI;

async function run() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(MONGO_URI);

  try {
    const missingQuery = {
      $or: [
        { createdByProfile: { $exists: false } },
        { createdByProfile: null },
        { "createdByProfile._id": { $exists: false } },
        { "createdByProfile._id": null },
      ],
    };

    const totalMissing = await Transaction.countDocuments(missingQuery);
    const sample = await Transaction.find(missingQuery)
      .select("_id user type category partner amount description isDone date createdAt updatedAt createdByProfile")
      .sort({ date: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const byUser = await Transaction.aggregate([
      { $match: missingQuery },
      { $group: { _id: "$user", count: { $sum: 1 }, latestDate: { $max: "$date" } } },
      { $sort: { count: -1, latestDate: -1 } },
      { $limit: 100 },
    ]);

    console.log(JSON.stringify({
      ok: true,
      totalMissing,
      byUser,
      sample,
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
