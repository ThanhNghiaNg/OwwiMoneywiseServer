const User = require("../models/User");
const authController = require("../controllers/auth");
const isAuth = require("../middlewares/isAuthUser");
const { body } = require("express-validator/check");
const express = require("express");
const router = express.Router();


router.get("/authenticated", authController.getAuthenticated);

router.post(
  "/login",
  [
    body("username").custom((value, { req }) => {
      return User.findOne({ username: value }).then((user) => {
        if (!user) {
          return Promise.reject("User is not Signed up!");
        }
      });
    }),
    body(
      "password",
      "Password must not contain special characters and have at least 6 characters!"
    )
      .isAlphanumeric()
      .isLength({ min: 6 }),
  ],
  authController.postLogin
);
router.post(
  "/register",
  [
    // body("email", "Invalid Email!").isEmail(),
    body("username", "Username must have at least 6 characters").isLength({
      min: 6,
    }),
    body("username").custom((value, { req }) => {
      return User.findOne({ username: value }).then((user) => {
        if (user) {
          return Promise.reject("Email is already registered!");
        }
      });
    }),
    body(
      "password",
      "Password must not contain special characters and have at least 6 characters!"
    )
      .isAlphanumeric()
      .isLength({ min: 6 }),
    body("fullName", "Name must have at least 3 characters").isLength({
      min: 3,
    }),

    body("phone", "Phone must not be empty!").isLength({ min: 1 }),
    body("phone", "Phone must be numeric only!").isNumeric(),
  ],
  authController.postRegister
);

router.post("/logout", isAuth, authController.postLogout);

module.exports = router;
