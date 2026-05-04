const mongoose = require("mongoose");
const User = require("../models/User");
const Type = require("../models/Type");
const Profile = require("../models/Profile");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator/check");

exports.getAuthenticated = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.send({ isLoggedIn: false });
  } else {
    return res.send({ isLoggedIn: true });
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
      return bcrypt.compare(password, user.password).then((doMatch) => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          req.session.sessionID = req.sessionID;
          req.session.ua = req.headers["user-agent"];
          if (user.isAdmin || role === (user.isAdmin ? "admin" : "user")) {
            return res.send({
              message: "Successfully Login!",
              token: user._id,
              name: user.fullName,
              role: user.role,
              sessionToken: req.sessionID
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
