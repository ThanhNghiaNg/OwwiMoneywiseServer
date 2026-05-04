const Profile = require("../models/Profile");

const MAX_PROFILES_PER_USER = 6;

async function getFallbackProfile(userId, excludedProfileId) {
  return Profile.findOne({
    user: userId,
    _id: { $ne: excludedProfileId },
  }).sort({ isDefault: -1, order: 1, createdAt: 1 });
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

exports.createProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const name = String(req.body.name || "").trim();
    const avatarUrl = req.body.avatarUrl || "";
    const color = req.body.color || "";

    if (!name) {
      return res.status(422).send({ message: "Profile name is required!" });
    }

    const profileCount = await Profile.countDocuments({ user: userId });
    if (profileCount >= MAX_PROFILES_PER_USER) {
      return res.status(422).send({ message: "Maximum 6 profiles per account!" });
    }

    const latestProfile = await Profile.findOne({ user: userId }).sort({ order: -1, createdAt: -1 });
    const nextOrder = latestProfile ? (latestProfile.order || 0) + 1 : 0;

    const profile = await Profile.create({
      user: userId,
      name,
      avatarUrl,
      color,
      isDefault: profileCount === 0,
      order: nextOrder,
    });

    return res.status(201).send(profile);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
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
  try {
    const userId = req.session.user._id;
    const profileId = req.params.id;

    const profileCount = await Profile.countDocuments({ user: userId });
    if (profileCount <= 1) {
      return res.status(422).send({ message: "Cannot delete the last profile!" });
    }

    const profile = await Profile.findOne({ _id: profileId, user: userId });
    if (!profile) {
      return res.status(404).send({ message: "Profile not found!" });
    }

    await Profile.deleteOne({ _id: profileId, user: userId });

    const activeProfileId = String(req.session.activeProfileId || "");
    if (activeProfileId && activeProfileId === String(profile._id)) {
      const fallbackProfile = await getFallbackProfile(userId, profile._id);
      req.session.activeProfileId = fallbackProfile ? fallbackProfile._id : null;
    }

    return res.send({
      message: "Deleted profile successfully!",
      activeProfileId: req.session.activeProfileId || null,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: err.message });
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
