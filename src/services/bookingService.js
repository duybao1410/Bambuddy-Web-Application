const Booking = require("../models/bookingSchema");
const { Tour } = require("../models/tourSchema");
const { getAllDayGoogleCalendarUrl } = require('../utils/calendarHelper');
const mongoose = require("mongoose");

class BookingService {
  // race condition
  async createBooking(tourID, tourDate, userId) {
    if (!mongoose.Types.ObjectId.isValid(tourID)) {
      throw new Error("Invalid tour ID");
    }
    if (!tourDate) {
      throw new Error("Missing tourDate");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Atomic update: chỉ set isBooked nếu nó đang false
      const updatedTour = await Tour.findOneAndUpdate(
        {
          _id: tourID,
          "availability.date": tourDate,
          "availability.isBooked": false,
        },
        {
          $set: { "availability.$.isBooked": true },
        },
        { new: true, session }
      );

      if (!updatedTour) {
        throw new Error("No available slot for the selected date");
      }

      // Tạo booking
      const newBooking = await Booking.create(
        [
          {
            tourID,
            userID: userId,
            guideID: updatedTour.guideId,
            tourDate,
            pricing: updatedTour.pricing,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return newBooking[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async getBookingById(bookingId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new Error("Invalid booking ID");
    }
    const booking = await Booking.findById(bookingId)
      .populate("tourID")
      .populate("userID", "profileInfo.firstName profileInfo.lastName")
      .populate("guideID", "profileInfo.firstName profileInfo.lastName");
    return booking;
  }

  async getAllBookings(filter = {}, sort = "desc") {
    const sortOrder = sort.toLowerCase() === "asc" ? 1 : -1;
    const bookings = await Booking.find(filter)
      .sort({ bookingDate: sortOrder })
      .lean();
    return bookings;
  }


  async getBookingsByGuide(guideId) {
    if (!mongoose.Types.ObjectId.isValid(guideId)) {
      throw new Error("Invalid guide ID");
    }
    const bookings = await Booking.find({ guideID: guideId })
      .populate("tourID")
      .populate("userID", "profileInfo.firstName profileInfo.lastName")
      .sort({ bookingDate: -1 });
    return bookings;
  }

  async getBookingsByUser(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    let bookings = await Booking.find({ userID: userId })
      .populate("tourID")
      .populate("guideID", "profileInfo.firstName profileInfo.lastName")
      .sort({ bookingDate: -1 });

    bookings = bookings.map(b => {
      const booking = b.toObject ? b.toObject() : b;

      // Add properties needed by the view
      booking.image = booking.tourID?.images?.[0] || 'placeholder.jpg';
      booking.tourTitle = booking.tourID?.title || 'Unknown Tour';
      booking.itinerary = booking.tourID?.itinerary || '';
      booking.guideName = `${booking.guideID?.profileInfo?.firstName || ''} ${booking.guideID?.profileInfo?.lastName || ''}`.trim() || 'Unknown Guide';
      booking.location = booking.tourID?.location || { address: 'Unknown Location' };
      booking.tourId = booking.tourID?._id;
      booking.userId = booking.userID;

      // Generate Google Calendar URL for confirmed bookings
      if (booking.status === "confirmed" && booking.tourDate) {
        booking.googleUrl = getAllDayGoogleCalendarUrl({
          title: booking.tourTitle,
          date: booking.tourDate,
          details: booking.itinerary || `Your booking for ${booking.tourTitle}`,
          location: booking.location.address || "",
        });
      }

      return booking;
    });

    return bookings;
  }

  async updateBookingStatus(bookingId, status) {
    const booking = await Booking.findById(bookingId).populate("tourID");
    if (!booking) throw new Error("Booking not found");

    booking.status = status;
    await booking.save();
    return booking;
  }
}
module.exports = new BookingService();
