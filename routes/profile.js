const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const requireActiveProfile = require("../middlewares/requireActiveProfile");
const profileController = require("../controllers/profile");

const router = express.Router();

router.get("/", isAuthUser, profileController.getProfiles);
router.post("/", isAuthUser, profileController.createProfile);
router.put("/:id", isAuthUser, profileController.updateProfile);
router.delete("/:id", isAuthUser, profileController.deleteProfile);
router.post("/select", isAuthUser, profileController.selectProfile);
router.get("/active", isAuthUser, requireActiveProfile, profileController.getActiveProfile);

module.exports = router;
