const partnerControllers = require("../controllers/partner");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const router = express.Router();

router.get("/all", isAuthUser, partnerControllers.getUserPartners);

router.post("/create", isAuthUser, partnerControllers.addPartner);

router.delete("/remove", isAuthUser, partnerControllers.deletePartner);

router.put("/update", isAuthUser, partnerControllers.updatePartner);

module.exports = router;
