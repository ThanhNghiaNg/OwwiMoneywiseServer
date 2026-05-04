const mongoose = require("mongoose");

const buildDefaultProfile = (user) => ({
  _id: new mongoose.Types.ObjectId(),
  name: user.fullName || user.username || "Default",
  description: "Default profile",
  isDefault: true,
});

const normalizeProfiles = (user) => {
  const rawProfiles = Array.isArray(user.profiles) ? user.profiles : [];

  if (!rawProfiles.length) {
    const defaultProfile = buildDefaultProfile(user);
    user.profiles = [defaultProfile];
    return { profiles: user.profiles, activeProfile: defaultProfile, changed: true };
  }

  let changed = false;
  const profiles = rawProfiles.map((profile, index) => {
    const nextProfile = {
      _id: profile._id || new mongoose.Types.ObjectId(),
      name: profile.name || user.fullName || user.username || `Profile ${index + 1}`,
      description: profile.description || "",
      isDefault: Boolean(profile.isDefault),
    };

    if (
      !profile._id ||
      nextProfile.name !== profile.name ||
      nextProfile.description !== profile.description ||
      nextProfile.isDefault !== profile.isDefault
    ) {
      changed = true;
    }

    return nextProfile;
  });

  if (!profiles.some((profile) => profile.isDefault)) {
    profiles[0].isDefault = true;
    changed = true;
  }

  user.profiles = profiles;
  const activeProfile = profiles.find((profile) => profile.isDefault) || profiles[0];

  return { profiles, activeProfile, changed };
};

const ensureUserProfiles = async (user) => {
  const { profiles, activeProfile, changed } = normalizeProfiles(user);
  if (changed) {
    await user.save();
  }

  return { profiles, activeProfile };
};

const sanitizeProfile = (profile) => ({
  _id: String(profile._id),
  name: profile.name,
  description: profile.description || "",
  isDefault: Boolean(profile.isDefault),
});

module.exports = {
  ensureUserProfiles,
  sanitizeProfile,
};
