const bcrypt = require("bcryptjs");
const User = require("../models/User");
const mongoose = require("mongoose");
const { ensureUserProfiles, sanitizeProfile } = require("../utils/profile");
require("dotenv").config();
const SALT = process.env.SALT || 12;

exports.getUserInfo = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).send({ message: "User not found!" });
    }

    const profiles = (user.profiles || []).map(sanitizeProfile);
    return res.send({
      _id: String(user._id),
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      isAdmin: user.isAdmin,
      profiles,
      activeProfile: req.session.activeProfile || null,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: "Internet server error!" });
  }
};

exports.updateUserInfo = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found!" });
    }
    const { fullName, email, phone, address } = req.body;
    await User.findByIdAndUpdate(
      { _id: userId },
      {
        fullName: fullName || user.fullName,
        email: email || user.email,
        phone: phone || user.phone,
        address: address || user.address,
      }
    );
    return res.send();
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: "Internet server error!" });
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found!" });
    }
    const comparePassword = await bcrypt.compare(oldPassword, user.password);
    if (!comparePassword) {
      return res.status(400).send({ message: "Old password is incorrect!" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, SALT);
    user.password = hashedPassword;
    await user.save();
    return res.send();
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: "Internet server error!" });
  }
};

exports.getProfiles = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).send({ message: "User not found!" });
    }

    const { profiles } = await ensureUserProfiles(user);
    req.session.profiles = profiles.map(sanitizeProfile);

    return res.send({
      profiles: req.session.profiles,
      activeProfile: req.session.activeProfile || null,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: "Internet server error!" });
  }
};

exports.createProfile = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).send({ message: "Profile name is required!" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).send({ message: "User not found!" });
    }

    await ensureUserProfiles(user);
    user.profiles.push({
      _id: new mongoose.Types.ObjectId(),
      name,
      description: description || "",
      isDefault: false,
    });
    await user.save();

    const nextProfiles = user.profiles.map(sanitizeProfile);
    req.session.profiles = nextProfiles;

    return res.status(201).send({
      message: "Created profile successfully!",
      profiles: nextProfiles,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: "Internet server error!" });
  }
};
