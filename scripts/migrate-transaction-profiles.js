require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");
const Profile = require("../models/Profile");
const Transaction = require("../models/Transaction");

const MONGO_URI = process.env.MONGO_URI;
const DEFAULT_PROFILE_NAME = "Personal";

async function getOrCreateDefaultProfile(userId) {
  const existingDefaultProfile = await Profile.findOne({ user: userId, isDefault: true }).lean();

  if (existingDefaultProfile) {
    return { profile: existingDefaultProfile, created: false };
  }

  const latestProfile = await Profile.findOne({ user: userId })
    .sort({ order: -1, createdAt: -1 })
    .lean();
  const nextOrder = latestProfile ? (latestProfile.order || 0) + 1 : 0;

  try {
    const createdProfile = await Profile.create({
      user: userId,
      name: DEFAULT_PROFILE_NAME,
      isDefault: true,
      order: nextOrder,
    });

    return { profile: createdProfile.toObject(), created: true };
  } catch (error) {
    if (error && error.code === 11000) {
      const defaultProfile = await Profile.findOne({ user: userId, isDefault: true }).lean();
      if (defaultProfile) {
        return { profile: defaultProfile, created: false };
      }
    }

    throw error;
  }
}

function buildCreatedByProfileSnapshot(profile) {
  return {
    _id: profile._id,
    name: profile.name,
    avatarUrl: profile.avatarUrl || "",
    color: profile.color || "",
  };
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

      const result = await Transaction.collection.updateMany(
        {
          user: user._id,
          $or: [
            { createdByProfile: { $exists: false } },
            { createdByProfile: null },
            { "createdByProfile._id": { $exists: false } },
            { "createdByProfile._id": null },
          ],
        },
        {
          $set: {
            createdByProfile: buildCreatedByProfileSnapshot(profile),
          },
        }
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
