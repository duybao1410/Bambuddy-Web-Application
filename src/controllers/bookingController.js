const express = require('express');
const bookingService = require('../services/bookingService');
const Booking = require('../models/bookingSchema');

class BookingController {
  async createBooking(req, res) {
   const tourID = req.params.tourID;  // GET tourID from params
  const { tourDate } = req.body;

    try {
      const createdBooking = await bookingService.createBooking(tourID, tourDate, req.user._id);
     // res.status(201).json({ success: true, data: createdBooking });
     res.redirect(`/user/booking`);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getBookingById(req, res) {
    const bookingId = req.params.id;

    try {
      const booking = await bookingService.getBookingById(bookingId);
      res.status(200).json({ success: true, data: booking });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getAllBookings(req, res) {
    try {
      const { sort = "desc", ...filter } = req.query;
      const bookings = await bookingService.getAllBookings(filter, sort);
      res.status(200).json({ success: true, data: bookings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getBookingsByGuide(req, res) {
    try {
      const guideId = req.user._id;
      const bookings = await bookingService.getBookingsByGuide(guideId);
      res.status(200).json({ success: true, data: bookings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
  async getBookingsByUser(req, res) {
    try {
      const userId = req.user._id;
      const bookings = await bookingService.getBookingsByUser(userId);

      res.render("user/my-trips", { bookings, user: req.user });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateBookingStatus(req, res) {
    try {
      const bookingId = req.params.id;
      const { status } = req.body;

      if (!['confirmed', 'cancelled', 'pending'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }

      const updatedBooking = await bookingService.updateBookingStatus(bookingId, status);

      res.status(200).json({ success: true, data: updatedBooking });
    } catch (error) {
      console.error("Error in updateBookingStatus:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

}

module.exports = new BookingController();