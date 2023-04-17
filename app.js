const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoDBStore = require("connect-mongodb-session")(session);
const User = require("./models/User");
const express = require("express");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const categoryRoutes = require("./routes/category")
const transactionRoutes = require("./routes/transaction")
const partnerRoutes = require("./routes/partner")

require("dotenv").config();

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: "UserSessions",
});

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());
// DEVELOP
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 3600 * 24, // 1 day
    },
  })
);

// // DEPLOY
// app.use(
//   cors({
//     origin: [],
//     credentials: true,
//     method: ["POST, PUT, PATCH, DELETE, GET"]
//   })
// );

// app.use(
//   session({
//     secret: "my secret",
//     resave: false,
//     saveUninitialized: false,
//     store: store,
//     cookie: {
//       sameSite: "none",
//       secure: true,
//       maxAge: 1000 * 3600 * 24 * 30, // 1 month
//     },
//   })
// );

app.use((req, res, next) => {
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
app.use("/category", categoryRoutes)
app.use("/transaction", transactionRoutes);
app.use("/partner", partnerRoutes)


mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(process.env.PORT || 5000);
  console.log("Server is running...");
});
