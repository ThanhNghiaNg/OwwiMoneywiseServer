const User = require("../models/User");
const Type = require("../models/Type");
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
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors.array()[0].msg });
  }
  User.findOne({ username })
    .then((user) => {
      return bcrypt.compare(password, user.password).then((doMatch) => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          req.session.sessionID = req.sessionID;
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

exports.postRegister = (req, res, next) => {
  const { username, password, fullName, email, phone, address } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).send({ message: errors.array()[0].msg });
  }

  bcrypt
    .hash(password, 12)
    .then((hashPassword) => {
      const newUser = new User({
        username,
        password: hashPassword,
        fullName,
        email,
        phone,
        address,
        isAdmin: false,
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
