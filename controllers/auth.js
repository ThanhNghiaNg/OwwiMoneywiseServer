const User = require("../models/User");
const Type = require("../models/Type");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator/check");
const { ensureUserProfiles, sanitizeProfile } = require("../utils/profile");

const buildAuthResponse = (user, session) => {
  const activeProfile = session.activeProfile || user.profiles?.find((profile) => String(profile._id) === String(session.activeProfileId)) || user.profiles?.[0];

  return {
    message: "Successfully Login!",
    token: user._id,
    name: user.fullName,
    role: user.role,
    sessionToken: session.id || session.sessionID,
    profiles: (user.profiles || []).map(sanitizeProfile),
    activeProfile: activeProfile ? sanitizeProfile(activeProfile) : null,
    requiresProfileSelection: !(session.activeProfileId && activeProfile),
  };
};

exports.getAuthenticated = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.send({ isLoggedIn: false });
  }

  return res.send({
    isLoggedIn: true,
    user: req.session.user
      ? {
          _id: String(req.session.user._id),
          username: req.session.user.username,
          fullName: req.session.user.fullName,
        }
      : null,
    profiles: req.session.profiles || [],
    activeProfile: req.session.activeProfile || null,
    requiresProfileSelection: !req.session.activeProfileId,
  });
};

exports.postLogin = async (req, res, next) => {
  try {
    const { username, password, role, profileId } = req.body;
    const lowercaseUsername = String(username).toLowerCase();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).send({ message: errors.array()[0].msg });
    }

    const user = await User.findOne({ username: lowercaseUsername });
    const doMatch = await bcrypt.compare(password, user.password);

    if (!doMatch) {
      return res.status(422).send({ message: "Password is incorrect!" });
    }

    if (!(user.isAdmin || role === (user.isAdmin ? "admin" : "user"))) {
      return res.status(403).send({ message: "Unauthorized!" });
    }

    const { profiles, activeProfile: defaultProfile } = await ensureUserProfiles(user);
    const selectedProfile = profileId
      ? profiles.find((profile) => String(profile._id) === String(profileId))
      : null;
    const activeProfile = selectedProfile || null;

    req.session.isLoggedIn = true;
    req.session.user = user;
    req.session.sessionID = req.sessionID;
    req.session.ua = req.headers["user-agent"];
    req.session.profiles = profiles.map(sanitizeProfile);
    req.session.activeProfileId = activeProfile ? String(activeProfile._id) : null;
    req.session.activeProfile = activeProfile ? sanitizeProfile(activeProfile) : null;

    return res.send(
      buildAuthResponse(
        { ...user.toObject(), profiles },
        {
          id: req.sessionID,
          sessionID: req.sessionID,
          activeProfileId: req.session.activeProfileId,
          activeProfile: req.session.activeProfile,
        }
      )
    );
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.postRegister = (req, res, next) => {
  const { username, password, fullName, email, phone, description } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors.array()[0].msg });
  }

  bcrypt
    .hash(password, 12)
    .then((hashPassword) => {
      const newUser = new User({
        username: String(username).toLowerCase(),
        password: hashPassword,
        fullName,
        email,
        phone,
        description,
        isAdmin: false,
        profiles: [
          {
            name: fullName || String(username).toLowerCase(),
            description: "Default profile",
            isDefault: true,
          },
        ],
      });
      return newUser.save().then(async (user) => {
        const incomeType = new Type({ name: "Income", user: user._id });
        const outcomeType = new Type({ name: "Outcome", user: user._id });
        await incomeType.save();
        await outcomeType.save();
        return res.status(201).send({ message: "Register Successfully!" });
      });
    })
    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

exports.postLogout = (req, res, next) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(403).send({ message: "Failed to logout!" });
      } else {
        return res.send({ message: "Logout Successfully!" });
      }
    });
  }
};

exports.postSelectProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).send({ message: "User not found!" });
    }

    const { profiles } = await ensureUserProfiles(user);
    const { profileId } = req.body;
    const activeProfile = profiles.find((profile) => String(profile._id) === String(profileId));

    if (!activeProfile) {
      return res.status(404).send({ message: "Profile not found!" });
    }

    req.session.user = user;
    req.session.profiles = profiles.map(sanitizeProfile);
    req.session.activeProfileId = String(activeProfile._id);
    req.session.activeProfile = sanitizeProfile(activeProfile);

    return res.send({
      message: "Profile selected successfully!",
      profiles: req.session.profiles,
      activeProfile: req.session.activeProfile,
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
