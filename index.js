require("dotenv").config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/database');
const session = require('express-session');
const passport = require('./src/config/ggauth');
const methodOverride = require("method-override");
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

//Import Routes
const authRoutes = require('./src/routes/authRoutes');
const tourRoutes = require('./src/routes/tourRoutes');
const threadRoutes = require('./src/routes/threadRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const guideRoutes = require('./src/routes/guideRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const feedbackRoutes = require("./src/routes/feedbackRoutes");
const memberRoutes = require('./src/routes/memberRoutes');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Session middleware
const {configureSession} = require('./src/config/session');
app.use(configureSession());
// Rolling session: refresh expiry on activity
app.use((req, res, next) => {
  if (req.session && typeof req.session.touch === 'function') {
    req.session.touch();
  }
  next();
});
//Passport middleware (must come after session)
app.use(passport.initialize());
app.use(passport.session());


// View engine
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Middleware to make user data available in all views (giup tat ca cac view trong ung dung co the truy cap thong tin nguoi dung ma khong can lap lai ma o moi route)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  // Ensure role is always available for navbar rendering
  if (res.locals.user && !res.locals.user.role && req.session.userRole) {
    res.locals.user.role = req.session.userRole;
  }
  next();
});

// Middleware to inject notifications into all views
const { injectNotifications } = require('./src/middleware/notificationMiddleware');
app.use(injectNotifications);

// Auth
app.use('/auth', authRoutes);

// Method Override for PUT and DELETE methods in forms
app.use(methodOverride("_method"));

// Routes
app.use('/', tourRoutes);
app.use('/threads', threadRoutes);
app.use('/', bookingRoutes);
app.use('/guide', guideRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/', feedbackRoutes);
app.use('/', memberRoutes);

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public/html/404.html'));
});


// Handle 500 - Server Error
app.use((err, req, res, next) => {
  console.error(err.stack); // log the error
  res.status(500).sendFile(path.join(__dirname, 'public/html/500.html'));
});


app.use('/getError', (req, res) => {
  throw new Error('This is a test error for the 500 error page.');
});


app.listen(PORT, () => {
    // console log removed for production cleanliness
});

