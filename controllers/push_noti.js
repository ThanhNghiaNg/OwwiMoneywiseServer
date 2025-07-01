const webPush = require('web-push');
const dotenv = require('dotenv');
dotenv.config();

webPush.setVapidDetails(
  'mailto: example@yourdomain.org',
  process.env.WEBPUSH_PUBLIC,
  process.env.WEBPUSH_PRIVATE,
)

exports.pushNoti = async (req, res, next) => {
  try {
    const sub = "https://fcm.googleapis.com/fcm/send/fB5FmedJMYY:APA91bHZv7JiZKhBwJdIWTuRNNf4gEj93ZJv3cwxk55xDDpKFtunreHikYGgreg6_J4XtlIpYFUnqS9jqnkmQrRcNtZ1NBvbKGOs54KY08yMgchNfMmzgW2PgGYcIrnbyRtx79UI53wC"
    const pushSubscription = {
        endpoint: sub,
        keys: {
          auth: "2I7J9YUUqlZ_gAIzb7Et4w",
          p256dh: "BJBHmTu2DcF5dhWr2hZzBhSoBF3KhDzAtsT16J0yT4JxwMOF2WbXHbRu_LV6IikiKhkSG_-juYhmmtHNCoetFxM"
        }
      };

    const result = await webPush.sendNotification(pushSubscription, JSON.stringify({
        title: "New Notification",
        body: "This is a test notification",
      }))
    console.log({result})
    return res.send(result);
  } catch (err) {
    console.log(err);
    return res.send({ message: err.message });
  }
};
