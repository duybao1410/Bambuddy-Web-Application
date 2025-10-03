const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();


router.post('/createBooking/:tourID', authMiddleware.verifySession, authMiddleware.verifyActiveUser, authMiddleware.verifyUserBooking, bookingController.createBooking);
router.get('/getBookingById/:id', authMiddleware.verifySession, authMiddleware.verifyActiveUser, bookingController.getBookingById);
router.get('/getAllBookings', authMiddleware.verifySession, authMiddleware.verifyActiveUser, bookingController.getAllBookings);
router.get('/getBookingsByUser', authMiddleware.verifySession, authMiddleware.verifyActiveUser, bookingController.getBookingsByUser);
router.get('/getBookingsByGuide', authMiddleware.verifyTourGuide, authMiddleware.verifyActiveUser, bookingController.getBookingsByGuide);
router.patch('/updateBookingStatus/:id', authMiddleware.verifyTourGuide, authMiddleware.verifyActiveUser, bookingController.updateBookingStatus);
module.exports = router;
