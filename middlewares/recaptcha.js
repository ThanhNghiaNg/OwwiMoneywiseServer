const Transaction = require("../models/Transaction");
require("dotenv").config();
const axios = require("axios");

// module.exports = async (req, res, next) => {
//     const { recaptchaToken } = req.body;
//     if (!recaptchaToken) {
//         return res.status(400).send({ message: "Recaptcha token is required." });
//     }
//     if (!process.env.G_SECRET_RECAPTCHA) {
//         return res.status(500).send({ message: "Recaptcha secret key is not configured." });
//     }
//     const secretKey = process.env.G_SECRET_RECAPTCHA;
//     const postData = {
//         secret: secretKey,
//         response: recaptchaToken,
//     }

//     try {
//         const response = await axios.post("https://www.google.com/recaptcha/api/siteverify", null, {
//             params: postData,
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded'
//             },
//         });
//         if (response.data.success) {
//             next();
//         } else {
//             return res.status(400).send({ message: "Recaptcha verification failed." });
//         }
//     } catch (error) {
//         console.error("Recaptcha verification error:", error);
//         return res.status(500).send({ message: "Recaptcha verification failed." });
//     }
// };

module.exports = async (req, res, next) => {
    next();
    return;
}
