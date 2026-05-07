require("dotenv").config();

const mongoose = require("mongoose");
const Profile = require("../models/Profile");
const Transaction = require("../models/Transaction");

const MONGO_URI = process.env.MONGO_URI;

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

  const transactionIds = parseList(process.env.TRANSACTION_IDS);
  const profileId = String(process.env.PROFILE_ID || "").trim();
  const allowOverwrite = String(process.env.ALLOW_OVERWRITE || "false") === "true";
  const dryRun = String(process.env.DRY_RUN || "true") !== "false";

  if (!transactionIds.length) {
    throw new Error("TRANSACTION_IDS is required (comma-separated)");
  }

  if (!profileId) {
    throw new Error("PROFILE_ID is required");
  }

  await mongoose.connect(MONGO_URI);

  try {
    const profile = await Profile.findById(profileId).lean();
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    const objectIds = transactionIds.map((id) => new mongoose.Types.ObjectId(id));
    const transactions = await Transaction.find({ _id: { $in: objectIds } })
      .select("_id user createdByProfile date description amount")
      .lean();

    if (!transactions.length) {
      throw new Error("No matching transactions found");
    }

    const invalidUserTransactions = transactions.filter(
      (transaction) => String(transaction.user) !== String(profile.user)
    );

    if (invalidUserTransactions.length) {
      throw new Error(`Profile ${profileId} belongs to a different user than ${invalidUserTransactions.length} transaction(s)`);
    }

    const targetTransactions = allowOverwrite
      ? transactions
      : transactions.filter(
          (transaction) =>
            !transaction.createdByProfile ||
            !transaction.createdByProfile._id
        );

    const skippedTransactions = allowOverwrite
      ? []
      : transactions.filter(
          (transaction) => transaction.createdByProfile && transaction.createdByProfile._id
        );

    const snapshot = buildCreatedByProfileSnapshot(profile);

    if (dryRun) {
      console.log(JSON.stringify({
        ok: true,
        dryRun: true,
        profile: snapshot,
        matchedCount: transactions.length,
        targetCount: targetTransactions.length,
        skippedTransactions,
        targetTransactions,
      }, null, 2));
      return;
    }

    if (!targetTransactions.length) {
      console.log(JSON.stringify({
        ok: true,
        dryRun: false,
        modifiedCount: 0,
        message: "No transactions eligible for repair.",
        skippedTransactions,
      }, null, 2));
      return;
    }

    const result = await Transaction.updateMany(
      { _id: { $in: targetTransactions.map((transaction) => transaction._id) } },
      { $set: { createdByProfile: snapshot } }
    );

    console.log(JSON.stringify({
      ok: true,
      dryRun: false,
      profile: snapshot,
      matchedCount: transactions.length,
      targetCount: targetTransactions.length,
      modifiedCount: result.modifiedCount || result.nModified || 0,
      skippedTransactions,
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
