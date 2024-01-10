const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoDBStore = require("connect-mongodb-session")(session);
const User = require("./models/User");
const UserSession = require("./models/UserSession");
const express = require("express");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const categoryRoutes = require("./routes/category");
const transactionRoutes = require("./routes/transaction");
const partnerRoutes = require("./routes/partner");
const { addIsDone } = require("./middlewares/updateTransaction");
const { ObjectID } = require("mongodb");

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

app.use(
  cors({
    origin: PRODUCTION ? FE_CLIENT_URL.split(",") : true,
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

// app.use(addIsDone);

app.use(async (req, res, next) => {
  const cookies = req.headers?.cookie?.split(";")?.reduce((acc, pair) => {
    const [key, value] = pair.split("=");
    acc[key.trim()] = value;
    return acc;
  }, {});

  const sessionID = cookies?.sessionToken || "";
  if (!req.session.user && !sessionID) {
    return next();
  }

  if (req.session.user) {
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
  } else if (sessionID) {
    store.get(sessionID, (err, session) => {
      User.findOne({ _id: session.user?._id || "" })
        .then((user) => {
          if (!user) {
            return next();
          }
          req.user = user;
          req.session.isLoggedIn = true;
          req.session.user = user;
          req.session.sessionID = req.sessionID;
          next();
        })
        .catch((err) => {
          return res.status(500).send("Internet Server Error");
        });
    });
  }
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

module.exports = app;
