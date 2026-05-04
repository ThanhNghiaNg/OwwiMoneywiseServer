require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");
const Profile = require("../models/Profile");
const Transaction = require("../models/Transaction");

const MONGO_URI = process.env.MONGO_URI;
const DEFAULT_PROFILE_NAME = "Personal";

async function getOrCreateDefaultProfile(userId) {
  let defaultProfile = await Profile.findOne({ user: userId, isDefault: true });

  if (defaultProfile) {
    return { profile: defaultProfile, created: false };
  }

  const latestProfile = await Profile.findOne({ user: userId }).sort({ order: -1, createdAt: -1 });
  const nextOrder = latestProfile ? (latestProfile.order || 0) + 1 : 0;

  defaultProfile = await Profile.create({
    user: userId,
    name: DEFAULT_PROFILE_NAME,
    isDefault: true,
    order: nextOrder,
  });

  return { profile: defaultProfile, created: true };
}

async function run() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(MONGO_URI);

  const summary = {
    usersChecked: 0,
    profilesCreated: 0,
    transactionsBackfilled: 0,
  };

  try {
    const users = await User.find({}, { _id: 1 }).lean();
    summary.usersChecked = users.length;

    for (const user of users) {
      const { profile, created } = await getOrCreateDefaultProfile(user._id);

      if (created) {
        summary.profilesCreated += 1;
      }

      const transactionIds = await Transaction.collection
        .find(
          {
            user: user._id,
            $or: [{ profile: { $exists: false } }, { profile: null }],
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      if (!transactionIds.length) {
        continue;
      }

      const transactionObjectIds = transactionIds.map((transaction) => transaction._id);
      const result = await Transaction.collection.updateMany(
        { _id: { $in: transactionObjectIds } },
        { $set: { profile: profile._id } }
      );

      summary.transactionsBackfilled += result.modifiedCount || 0;
    }

    console.log("Migration completed successfully.");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Migration failed.");
  console.error(error);
  process.exitCode = 1;
});
