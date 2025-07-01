const pushNotiControllers = require("../controllers/push_noti");
const express = require("express");
const router = express.Router();

router.get("/", pushNotiControllers.pushNoti);

router.postSubscribe("/subscribe", pushNotiControllers.pushNoti);

router.postUnSubscribe("/unsubscribe", pushNotiControllers.pushNoti);

module.exports = router;
