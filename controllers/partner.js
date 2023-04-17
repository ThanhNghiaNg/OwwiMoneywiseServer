const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Partner = require("../models/Partner");

exports.getUserPartners = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const partners = await Partner.find({ user: userId });
    return res.send(partners);
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.addPartner = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const partnerName = req.body.name;
    const age = req.body.age;
    const address = req.body.address;
    const newPartner = await new Partner({
      name: partnerName,
      user: userId,
      age,
      address,
    });
    await newPartner.save();
    return res.status(201).send({ message: "Created New Partner!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.deletePartner = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const partnerId = req.body.partnerId;
    const transactions = await Transaction.find({
      Partner: partnerId,
      user: userId,
    });
    if (transactions) {
      return res
        .status(403)
        .send({ message: "This Partner already has been in a transactions! You should only rename the partner!" });
    } else {
      const partner = await Partner.deleteById(partnerId);
      if (partner) {
        return res.status(200).send({ message: "Deleted Partner!" });
      } else {
        return res.status(422).send({ message: "Partner Id is not valid!" });
      }
    }
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.updatePartner = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const partnerId = req.body.partnerId;
    const partnerName = req.body.name;
    const newPartner = await Partner.updateOne(
      {
        user: userId,
        _id: partnerId,
      },
      { $set: { name: partnerName } }
    );
    await newPartner.save();
    return res.status(201).send({ message: "Created New Partner!" });
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};
