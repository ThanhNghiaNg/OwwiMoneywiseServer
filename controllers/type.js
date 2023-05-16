const Type = require("../models/Type");

exports.getAllType = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    console.log(userId);
    const types = await Type.find({ user: userId });
    return res.send(types);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: "Internet server error!" });
  }
};
