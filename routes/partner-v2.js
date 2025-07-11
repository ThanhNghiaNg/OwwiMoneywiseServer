const partnerControllers = require("../controllers/partner");
const express = require("express");
const isAuthUser = require("../middlewares/isAuthUser");
const router = express.Router();

router.get("/", isAuthUser, partnerControllers.getUserPartnersV2);

router.post("/", isAuthUser, partnerControllers.addPartner);

router.delete("/:id", isAuthUser, partnerControllers.deletePartner);

router.put("/:id", isAuthUser, partnerControllers.updatePartner);

module.exports = router;
