const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../models/userSchema");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("No email returned from Google"), null);
        }

        // Email lookup
        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          // Create a new user (Not found status)
          user = await User.create({
            googleId: profile.id,
            email: email.toLowerCase(),
            isActive: true,
            profileInfo: {
              firstName: profile.name?.givenName || "",
              lastName: profile.name?.familyName || "",
              profilePhoto: profile.photos?.[0]?.value || ""
            }
          });
        } else if (!user.googleId) {
          // If user exists from email signup-no googleId yet, link process
          user.googleId = profile.id;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
