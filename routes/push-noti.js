const pushNotiControllers = require("../controllers/push_noti");
const express = require("express");
const router = express.Router();

router.get("/", pushNotiControllers.pushNoti);

router.post("/subscribe", pushNotiControllers.pushNoti);

router.post("/unsubscribe", pushNotiControllers.pushNoti);

module.exports = router;
