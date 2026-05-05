const Profile = require("../models/Profile");

module.exports = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn || !req.session.user) {
      return res.status(401).send({ message: "Access Denied!" });
    }

    const activeProfileId = req.session.activeProfileId;
    if (!activeProfileId) {
      return res.status(428).send({
        code: "PROFILE_NOT_SELECTED",
        message: "Please select a profile first!",
      });
    }

    const profile = await Profile.findOne({
      _id: activeProfileId,
      user: req.session.user._id,
    }).lean();

    if (!profile) {
      req.session.activeProfileId = null;
      return res.status(428).send({
        code: "PROFILE_NOT_SELECTED",
        message: "Please select a profile first!",
      });
    }

    req.activeProfileId = profile._id;
    req.activeProfile = profile;
    next();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
