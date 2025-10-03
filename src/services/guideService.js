const { User } = require("../models/userSchema");
const { Tour } = require("../models/tourSchema");
const Booking = require("../models/bookingSchema");
const { Rating } = require("../models/ratingSchema");
const fs = require("fs");
const path = require("path");

class GuideService {
  //Get dashboard overview data for tour guide
  async getGuideDashboard(guideId) {
    try {
      //Get all tours for this guide
      const guideTours = await Tour.find({ guideId, isActive: true });
      const tourIds = guideTours.map((tour) => tour._id);

      // If no tours exist, return default values
      if (tourIds.length === 0) {
        return {
          totalBookings: 0,
          averageRating: 0,
          monthlyEarnings: 0,
          workingRequests: 0,
          totalTours: 0,
        };
      }

      //1. Total Booking
      const totalBookings = await Booking.countDocuments({
        tourID: { $in: tourIds },
        status: { $in: ["confirmed", "pending"] },
      });

      //2. Average Rating
      const ratingStats = await Rating.aggregate([
        { $match: { tourId: { $in: tourIds } } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$count" },
            totalRatings: { $sum: 1 },
          },
        },
      ]);

      const averageRating =
        ratingStats.length > 0
          ? Math.round(ratingStats[0].averageRating * 10) / 10
          : 0;

      //3. This Month Earnings
      const currentMonth = new Date();
      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );

      const monthlyBookings = await Booking.find({
        tourID: { $in: tourIds },
        status: "confirmed",
        bookingDate: { $gte: startOfMonth, $lte: endOfMonth },
      });

      const monthlyEarnings = monthlyBookings.reduce((total, booking) => {
        return total + (booking.pricing || 0);
      }, 0);

      // 4. Working Requests (Pending bookings)
      const workingRequests = await Booking.countDocuments({
        tourID: { $in: tourIds },
        status: "pending",
      });

      return {
        totalBookings,
        averageRating,
        monthlyEarnings,
        workingRequests,
        totalTours: guideTours.length,
      };
    } catch (error) {
      throw new Error(`Error getting dashboard stats: ${error.message}`);
    }
  }
  //Get guide profile information
  async getGuideProfile(guideId) {
    try {
      const guideData = await User.findById(guideId);
      if (!guideData) {
        throw new Error("Guide not found");
      }
      return guideData;
    } catch (error) {
      console.error("Error fetching guide profile:", error);
      throw new Error(`Error fetching guide profile: ${error.message}`);
    }
  }
  // Update Guide Profile Information
  async updateGuideProfile(userId, profileData, file) {
    try {
      const guide = await User.findById(userId);
      if (!guide) {
        throw new Error("User not found");
      }
      const currentPhoto = guide.profileInfo.profilePhoto;

      // Sanitize: accept only whitelisted fields and validate input
      const { firstName, lastName, city, bio, phone, facebook, instagram, professionalTitle, languages, specializations } = profileData || {};

      const sanitizedData = {
        firstName: this.sanitizeString(firstName, 50),
        lastName: this.sanitizeString(lastName, 50),
        city: this.sanitizeString(city, 100),
        bio: this.sanitizeString(bio, 500),
        phone: this.sanitizeString(phone, 20),
        facebook: this.sanitizeUrl(facebook),
        instagram: this.sanitizeUrl(instagram),
        professionalTitle: this.sanitizeString(professionalTitle, 100),
      };

      const update = {
        "profileInfo.firstName": sanitizedData.firstName,
        "profileInfo.lastName": sanitizedData.lastName,
        "profileInfo.city": sanitizedData.city,
        "profileInfo.bio": sanitizedData.bio,
        "profileInfo.phone": sanitizedData.phone,
        "profileInfo.facebook": sanitizedData.facebook,
        "profileInfo.instagram": sanitizedData.instagram,
        "guideInfo.professionalTitle": sanitizedData.professionalTitle,
        "guideInfo.languages": languages,
        "guideInfo.specializations": specializations,
      };

      //Delete existing photo
      if (file) {
        if (currentPhoto && currentPhoto !== "") {
          const photoPath = path.join(
            __dirname,
            "../../uploads/profilePicture",
            currentPhoto
          );
          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
          }
        }
        update["profileInfo.profilePhoto"] = file.filename;
      }

      const updatedGuide = await User.findByIdAndUpdate(userId, update, {
        new: true,
      });

      return updatedGuide;
    } catch (error) {
      console.error("Error updating guide profile:", error);
      throw error;
    }
  }

  //Add a certification
  async addCertification(guideId, file) {
    try {
      const guide = await User.findById(guideId);

      const updatedGuide = await User.findByIdAndUpdate(
        guideId,
        {
          $push: {
            "guideInfo.certifications": {
              verificationPhoto: file.filename,
              isVerified: false,
            },
          },
        },
        { new: true }
      );
      return updatedGuide;
    } catch (error) {
      console.error("Error adding certification:", error);
      throw error;
    }
  }

  async getBookings(userId, page, limit) {
    const skip = (page - 1) * limit;

    const totalBookings = await Booking.countDocuments({ guideID: userId });
    const totalPages = Math.ceil(totalBookings / limit);

    const bookings = await Booking.find({ guideID: userId })
      .populate("tourID", "title")
      .populate("userID", "email profileInfo.firstName profileInfo.lastName")
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const bookingData = bookings.map((b) => ({
      id: b._id,
      service: b.tourID?.title || "Untitled Tour",
      userName: b.userID
        ? `${b.userID.profileInfo.firstName} ${b.userID.profileInfo.lastName}`
        : "Unknown Guide",
      userEmail: b.userID?.email || "Unknown",
      tourDate: b.tourDate,
      bookingDate: b.bookingDate,
      status: b.status,
    }));

    return {
      bookings: bookingData,
      pagination: {
        currentPage: page,
        totalPages,
        totalBookings,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async approveBooking(bookingId, guideId) {
    try {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status !== "pending") {
        throw new Error("Only pending bookings can be approved");
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        { status: "confirmed" },
        { new: true }
      );

      return updatedBooking;
    } catch (error) {
      console.error("Error approving booking:", error);
      throw error;
    }
  }

  async cancelBooking(bookingId, guideId) {
    try {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status === "cancelled") {
        throw new Error("Booking is already cancelled");
      }

      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        { status: "cancelled" },
        { new: true }
      );

      return updatedBooking;
    } catch (error) {
      console.error("Error cancelling booking:", error);
      throw error;
    }
  }

  async getCertificationHistory(guideId) {
    try {
      const guide = await User.findById(guideId);
      if (!guide || !guide.guideInfo) {
        return [];
      }
      
      return guide.guideInfo.certifications || [];
    } catch (error) {
      console.error("Error fetching certification history:", error);
      throw error;
    }
  }

  // Sanitization helper methods
  sanitizeString(value, maxLength = 255) {
    if (!value || typeof value !== "string") return "";

    // Remove HTML tags and trim whitespace
    const sanitized = value.replace(/<[^>]*>/g, "").trim();

    // Limit length
    return sanitized.length > maxLength
      ? sanitized.substring(0, maxLength)
      : sanitized;
  }

  sanitizeUrl(value) {
    if (!value || typeof value !== "string") return "";

    const sanitized = value.trim();

    // Basic URL validation for social media
    if (sanitized && !sanitized.match(/^https?:\/\/.+/)) {
      // If it doesn't start with http/https, assume it's just a username and prepend the domain
      return sanitized;
    }

    return sanitized;
  }
}

module.exports = new GuideService();
