const mongoose = require("mongoose");
const User = require("../models/User");
const Type = require("../models/Type");
const Profile = require("../models/Profile");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator/check");

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
          req.session.isLoggedIn = true;
          req.session.user = user;
          req.session.sessionID = req.sessionID;
          req.session.ua = req.headers["user-agent"];
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

      await Profile.create(
        [
          {
            user: user._id,
            name: "Personal",
            isDefault: true,
            order: 0,
          },
        ],
        { session }
      );

      await Type.create(
        [
          { name: "Income", user: user._id },
          { name: "Outcome", user: user._id },
        ],
        { session }
      );
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
