const mongoose = require("mongoose");
const Profile = require("../models/Profile");

const MAX_PROFILES_PER_USER = 6;

async function getFallbackProfile(userId, excludedProfileId, session) {
  return Profile.findOne({
    user: userId,
    _id: { $ne: excludedProfileId },
  }, null, session ? { session } : undefined).sort({ isDefault: -1, order: 1, createdAt: 1 });
}

exports.getProfiles = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const profiles = await Profile.find({ user: userId }).sort({ order: 1, createdAt: 1 });
    return res.send(profiles);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.getActiveProfile = async (req, res) => {
  return res.send({
    activeProfileId: req.activeProfileId,
    profile: req.activeProfile,
  });
};

exports.createProfile = async (req, res) => {
  let session;

  try {
    const userId = req.session.user._id;
    const name = String(req.body.name || "").trim();
    const avatarUrl = req.body.avatarUrl || "";
    const color = req.body.color || "";

    if (!name) {
      return res.status(422).send({ message: "Profile name is required!" });
    }

    session = await mongoose.startSession();

    let createdProfile;
    await session.withTransaction(async () => {
      const profiles = await Profile.find({ user: userId }, null, { session })
        .sort({ order: 1, createdAt: 1 });

      if (profiles.length >= MAX_PROFILES_PER_USER) {
        throw new Error("MAX_PROFILES_REACHED");
      }

      const latestProfile = profiles[profiles.length - 1];
      const nextOrder = latestProfile ? (latestProfile.order || 0) + 1 : 0;

      const createdProfiles = await Profile.create(
        [
          {
            user: userId,
            name,
            avatarUrl,
            color,
            isDefault: profiles.length === 0,
            order: nextOrder,
          },
        ],
        { session }
      );

      createdProfile = createdProfiles[0];
    });

    return res.status(201).send(createdProfile);
  } catch (err) {
    console.log(err);

    if (err.message === "MAX_PROFILES_REACHED") {
      return res.status(422).send({ message: "Maximum 6 profiles per account!" });
    }

    if (err && err.code === 11000) {
      return res.status(409).send({ message: "Profile ordering conflict detected. Please retry!" });
    }

    return res.status(500).send({ message: err.message });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const profileId = req.params.id;
    const name = req.body.name !== undefined ? String(req.body.name).trim() : undefined;
    const avatarUrl = req.body.avatarUrl;
    const color = req.body.color;

    const profile = await Profile.findOne({ _id: profileId, user: userId });
    if (!profile) {
      return res.status(404).send({ message: "Profile not found!" });
    }

    if (name !== undefined && !name) {
      return res.status(422).send({ message: "Profile name is required!" });
    }

    if (name !== undefined) {
      profile.name = name;
    }
    if (avatarUrl !== undefined) {
      profile.avatarUrl = avatarUrl;
    }
    if (color !== undefined) {
      profile.color = color;
    }

    await profile.save();
    return res.send(profile);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};

exports.deleteProfile = async (req, res) => {
  let session;

  try {
    const userId = req.session.user._id;
    const profileId = req.params.id;

    session = await mongoose.startSession();

    let nextActiveProfileId = req.session.activeProfileId || null;
    await session.withTransaction(async () => {
      const profileCount = await Profile.countDocuments({ user: userId }).session(session);
      if (profileCount <= 1) {
        throw new Error("CANNOT_DELETE_LAST_PROFILE");
      }

      const profile = await Profile.findOne({ _id: profileId, user: userId }, null, { session });
      if (!profile) {
        throw new Error("PROFILE_NOT_FOUND");
      }

      const fallbackProfile = await getFallbackProfile(userId, profile._id, session);

      await Profile.deleteOne({ _id: profileId, user: userId }).session(session);

      if (profile.isDefault && fallbackProfile) {
        await Profile.updateOne(
          { _id: fallbackProfile._id, user: userId },
          { $set: { isDefault: true } },
          { session }
        );
      }

      const activeProfileId = String(req.session.activeProfileId || "");
      if (activeProfileId && activeProfileId === String(profile._id)) {
        nextActiveProfileId = fallbackProfile ? fallbackProfile._id : null;
      }
    });

    req.session.activeProfileId = nextActiveProfileId;

    return res.send({
      message: "Deleted profile successfully!",
      activeProfileId: req.session.activeProfileId || null,
    });
  } catch (err) {
    console.log(err);

    if (err.message === "CANNOT_DELETE_LAST_PROFILE") {
      return res.status(422).send({ message: "Cannot delete the last profile!" });
    }

    if (err.message === "PROFILE_NOT_FOUND") {
      return res.status(404).send({ message: "Profile not found!" });
    }

    return res.status(500).send({ message: err.message });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

exports.selectProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const profileId = req.body.profileId;

    if (!profileId) {
      return res.status(422).send({ message: "Profile id is required!" });
    }

    const profile = await Profile.findOne({ _id: profileId, user: userId });
    if (!profile) {
      return res.status(404).send({ message: "Profile not found!" });
    }

    req.session.activeProfileId = profile._id;

    return res.send({
      message: "Profile selected successfully!",
      activeProfileId: profile._id,
      profile,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
  }
};
