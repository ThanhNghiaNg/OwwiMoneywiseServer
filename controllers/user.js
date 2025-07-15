const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();
const SALT = process.env.SALT || 12;

exports.getUserInfo = async (req, res, next) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ message: "User not found!" });
        }
        delete user.password
        return res.send(user);
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
        await User.findByIdAndUpdate({ _id: userId }, {
            fullName: fullName || user.fullName,
            email: email || user.email,
            phone: phone || user.phone,
            address: address || user.address
        })
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

