const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoDBStore = require("connect-mongodb-session")(session);
const User = require("./models/User");
const express = require("express");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const categoryRoutes = require("./routes/category");
const transactionRoutes = require("./routes/transaction");
const partnerRoutes = require("./routes/partner");
const Transaction = require("./models/Transaction");

require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT;
const FE_CLIENT_URL = process.env.FE_CLIENT_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;
const PRODUCTION = process.env.PRODUCTION;

const store = new MongoDBStore({
  uri: MONGO_URI,
  collection: "UserSessions",
});

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.set("trust proxy", 1);
// // DEVELOP
// app.use(
//   cors({
//     origin: true,
//     credentials: true,
//   })
// );

// app.use(
//   session({
//     secret: SESSION_SECRET,
//     saveUninitialized: false,
//     resave: false,
//     store: store,
//     cookie: {
//       // sameSite: "none", // UNCOMMENT FOR DEPLOY
//       // secure: true, // UNCOMMENT FOR DEPLOY
//       maxAge: 10000 * 60 * 60 * 24, // One day in milliseconds
//     },
//   })
// );
console.log({
  origin: PRODUCTION ? [FE_CLIENT_URL] : true,
  credentials: true,
  method: ["POST, PUT, PATCH, DELETE, GET"],
});

console.log({
  maxAge: 10000 * 3600 * 24 * 30, // 10 day
  ...(PRODUCTION ? { sameSite: "none", secure: true } : {}),
});

// DEPLOY
app.use(
  cors({
    origin: PRODUCTION ? [FE_CLIENT_URL] : true,
    credentials: true,
    method: ["POST, PUT, PATCH, DELETE, GET"],
  })
);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 10000 * 3600 * 24 * 30, // 10 day
      ...(PRODUCTION ? { sameSite: "none", secure: true } : {}),
    },
  })
);

app.use(async (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      return res.status(500).send("Internet Server Error");
    });
});

app.use(authRoutes);

app.use("/user", userRoutes);
app.use("/category", categoryRoutes);
app.use("/transaction", transactionRoutes);
app.use("/partner", partnerRoutes);

mongoose.connect(MONGO_URI).then(() => {
  app.listen(PORT || 5000);
  console.log("Server is running...");
});
