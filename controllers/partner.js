const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Partner = require("../models/Partner");

exports.getUserPartners = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const typeId = req.query.typeId || "";
    const partners = await Partner.find({
      user: userId,
      ...(typeId ? { type: typeId } : {}),
    }).sort([['updatedAt', 'desc']]);
    return res.send(partners);
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};

exports.getUserPartnersV2 = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const typeId = req.query.typeId || "";
    const partners = await Partner.find({
      user: userId,
      ...(typeId ? { type: typeId } : {}),
    })
      .lean()
      .populate({
        path: "type",
        select: "name",
        options: {
          lean: true,
        }
      })
      .sort([['updatedAt', 'desc']]);
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
    const description = req.body.description;
    const type = req.body.type;
    const newPartner = await new Partner({
      name: partnerName,
      user: userId,
      description,
      type,
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
    const partnerId = req.params.id;
    const transactions = await Transaction.find({
      partner: partnerId,
      user: userId,
    });
  
    if (transactions && transactions.length) {
      return res
        .status(403)
        .send({
          message:
            "This Partner already has been in a transactions! You should only rename the partner or delete the transactions first.",
        });
    } else {
      const partner = await Partner.findByIdAndDelete(partnerId);
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
    const partnerId = req.params.id;
    const partnerName = req.body.name;
    const description = req.body.description;
    const type = req.body.type;
    await Partner.updateOne(
      {
        user: userId,
        _id: partnerId,
      },
      { $set: { name: partnerName, description, type } }
    ).then(result=>{
      result.ok && result.nModified
        ? res.status(201).send({ message: "Updated New Partner!" })
        : res.status(400).send({ message: "Failed To Updated Partner!" })
    });
    return 
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};
