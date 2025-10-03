const session = require("express-session");
const MongoStore = require("connect-mongo");

const SESSION_CONFIG = {
  secret: process.env.SESSION_SECRET || "secretkey",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/travel_guide",
    ttl: 60 * 20, // 20 minutes idle timeout at store level
    touchAfter: 60, // reduce write frequency
  }),
  cookie: {
    secure: false,
   maxAge: 1000 * 60 * 60 * 6,// 6 hours
  },
};

const configureSession = () => {
  return session(SESSION_CONFIG);
};

module.exports = {
    SESSION_CONFIG,
    configureSession
}
