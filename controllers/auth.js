const mongoose = require("mongoose");
const User = require("../models/User");
const Type = require("../models/Type");
const Profile = require("../models/Profile");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator/check");
const { verifyGoogleCredential } = require("../utils/googleAuth");
const {
  createResetToken,
  hashResetToken,
  getResetUrl,
  sendPasswordResetEmail,
} = require("../utils/passwordReset");

async function buildAuthPayload(user, activeProfileId) {
  const profiles = await Profile.find({ user: user._id })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const sanitizedUser = {
    _id: user._id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    googleLinked: !!user.googleId,
    googleEmail: user.googleEmail,
    address: user.address,
    isAdmin: user.isAdmin,
  };

  const validActiveProfile = activeProfileId
    ? profiles.find((profile) => String(profile._id) === String(activeProfileId))
    : null;

  return {
    user: sanitizedUser,
    profiles,
    activeProfileId: validActiveProfile ? validActiveProfile._id : null,
    needsProfileSelection: profiles.length > 0 && !validActiveProfile,
  };
}

exports.getAuthenticated = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      return res.send({ isLoggedIn: false });
    }

    const payload = await buildAuthPayload(req.session.user, req.session.activeProfileId);

    if (!payload.activeProfileId && req.session.activeProfileId) {
      req.session.activeProfileId = null;
    }

    return res.send({
      isLoggedIn: true,
      ...payload,
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

function setLoginSession(req, user) {
  req.session.isLoggedIn = true;
  req.session.user = user;
  req.session.sessionID = req.sessionID;
  req.session.ua = req.headers["user-agent"];
}

async function createDefaultUserResources(userId, session) {
  await Profile.create([{ user: userId, name: "Personal", isDefault: true, order: 0 }], { session });
  await Type.create([{ name: "Income", user: userId }, { name: "Outcome", user: userId }], { session });
}

exports.postLogin = (req, res, next) => {
  const { username, password, role } = req.body;

  const lowercaseUsername = String(username).toLowerCase();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors.array()[0].msg });
  }
  User.findOne({ username: lowercaseUsername })
    .then((user) => {
      if (!user) {
        return res.status(422).send({ message: "Username does not exist!" });
      }

      return bcrypt.compare(password, user.password).then(async (doMatch) => {
        if (doMatch) {
          setLoginSession(req, user);
          if (user.isAdmin || role === (user.isAdmin ? "admin" : "user")) {
            const payload = await buildAuthPayload(user, req.session.activeProfileId);

            if (!payload.activeProfileId && req.session.activeProfileId) {
              req.session.activeProfileId = null;
            }

            return res.send({
              message: "Successfully Login!",
              token: user._id,
              name: user.fullName,
              role: user.role,
              sessionToken: req.sessionID,
              ...payload,
            });
          } else {
            return res.status(403).send({ message: "Unauthorized!" });
          }
        } else {
          return res.status(422).send({ message: "Password is incorrect!" });
        }
      });
    })
    .catch((err) => {
      res.status(500).send({ message: err.message });
    });
};

exports.postRegister = async (req, res, next) => {
  const { username, password, fullName, email, phone, description } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors.array()[0].msg });
  }

  let session;

  try {
    const hashPassword = await bcrypt.hash(password, 12);

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const users = await User.create(
        [
          {
            username: String(username).toLowerCase(),
            password: hashPassword,
            fullName,
            email,
            phone,
            description,
            isAdmin: false,
          },
        ],
        { session }
      );

      const user = users[0];

      await createDefaultUserResources(user._id, session);
    });

    return res.status(201).send({ message: "Register Successfully!" });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

exports.postForgotPassword = async (req, res, next) => {
  const { email } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors.array()[0].msg });
  }

  try {
    const lookup = String(email).toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: lookup },
        { username: lookup },
      ],
    });

    if (user) {
      const { token, hashedToken, expiresAt } = createResetToken();
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = expiresAt;
      await user.save();

      const resetUrl = getResetUrl(token);
      await sendPasswordResetEmail(user, resetUrl);
    }

    return res.send({
      message: "If an account exists, password reset instructions have been sent.",
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.postResetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors.array()[0].msg });
  }

  try {
    const hashedToken = hashResetToken(token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(422).send({ message: "Reset link is invalid or expired!" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.send({ message: "Password reset successfully!" });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.postGoogleLogin = async (req, res, next) => {
  try {
    const googleProfile = await verifyGoogleCredential(req.body.credential);
    let user = await User.findOne({ googleId: googleProfile.googleId });

    if (!user) {
      const existingEmailUser = await User.findOne({
        $or: [{ email: googleProfile.email }, { username: googleProfile.email }],
      });

      if (existingEmailUser) {
        return res.status(409).send({
          message: "Email is already used. Please login with username/password and link Google in Settings.",
        });
      }

      let session;
      try {
        session = await mongoose.startSession();
        await session.withTransaction(async () => {
          const users = await User.create(
            [
              {
                username: googleProfile.email,
                password: undefined,
                fullName: googleProfile.fullName,
                email: googleProfile.email,
                phone: "",
                googleId: googleProfile.googleId,
                googleEmail: googleProfile.email,
                googleAvatar: googleProfile.picture,
                isAdmin: false,
              },
            ],
            { session }
          );

          user = users[0];
          await createDefaultUserResources(user._id, session);
        });
      } finally {
        if (session) session.endSession();
      }
    }

    setLoginSession(req, user);
    const payload = await buildAuthPayload(user, req.session.activeProfileId);

    return res.send({
      message: "Successfully Login!",
      token: user._id,
      name: user.fullName,
      role: user.role,
      sessionToken: req.sessionID,
      ...payload,
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

exports.postGoogleLink = async (req, res, next) => {
  try {
    const googleProfile = await verifyGoogleCredential(req.body.credential);
    const linkedUser = await User.findOne({ googleId: googleProfile.googleId });

    if (linkedUser && String(linkedUser._id) !== String(req.session.user._id)) {
      return res.status(409).send({ message: "This Google account is already linked to another user." });
    }

    const user = await User.findById(req.session.user._id);
    const emailUser = await User.findOne({
      $or: [{ email: googleProfile.email }, { username: googleProfile.email }],
    });

    if (emailUser && String(emailUser._id) !== String(user._id)) {
      return res.status(409).send({ message: "Email is already used by another account." });
    }

    if (user.googleId && user.googleId !== googleProfile.googleId) {
      return res.status(409).send({
        message: "This account is already linked with another Google account.",
      });
    }

    user.googleId = googleProfile.googleId;
    user.googleEmail = googleProfile.email;
    user.googleAvatar = googleProfile.picture;
    if (!user.email) user.email = googleProfile.email;
    await user.save();

    req.session.user = user;
    const payload = await buildAuthPayload(user, req.session.activeProfileId);

    return res.send({ message: "Google account linked successfully!", ...payload });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
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
