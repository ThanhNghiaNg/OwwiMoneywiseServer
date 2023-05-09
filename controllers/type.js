const Type = require("../models/Type");

exports.getAllType = async (req, res, next) => {
  try {
    const types = await Type.find({});
    return res.send(types);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: "Internet server error!" });
  }
};
