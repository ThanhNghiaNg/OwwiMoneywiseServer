const User = require("../models/User");
const authController = require("../controllers/auth");
const isAuth = require("../middlewares/isAuthUser");
const { body } = require("express-validator/check");
const express = require("express");
const router = express.Router();
const recaptcha = require("../middlewares/recaptcha");


router.get("/whoami", authController.getAuthenticated);

router.post(
  "/login",
  recaptcha,
  [
    body("username").custom((value, { req }) => {
      return User.findOne({ username: { $regex: value, $options: "i" } }).then((user) => {
        if (!user) {
          return Promise.reject("User is not Signed up!");
        }
      });
    }),
    body(
      "password",
      "Password must have at least 6 characters!"
    )
      .isLength({ min: 6 }),
  ],
  authController.postLogin
);
router.post(
  "/register",
  [
    body("email", "Invalid Email!").isEmail().optional(),
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
      "Password must have at least 6 characters!"
    )
      .isLength({ min: 6 }),
    body("fullName", "Name must have at least 3 characters").isLength({
      min: 3,
    }).optional(),

    body("phone", "Phone must not be empty!").isLength({ min: 1 }).optional(),
    body("phone", "Phone must be numeric only!").isNumeric().optional(),
  ],
  authController.postRegister
);

router.post("/logout", isAuth, authController.postLogout);

module.exports = router;
