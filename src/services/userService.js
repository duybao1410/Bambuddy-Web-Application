const { User } = require("../models/userSchema");
const Booking = require("../models/bookingSchema");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

class UserService {
  // Get profile
  async getProfile(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) throw new Error("User not found");
    return user;
  }

  // Public profile: safe fields + active threads
  async getPublicProfile(userId) {
    const { Thread } = require('../models/threadSchema');

    const user = await User.findById(userId).lean();
    if (!user) return null;

    // Safe public profile fields only
    const safeProfile = {
      _id: user._id,
      role: user.role,
      profileInfo: {
        firstName: user.profileInfo?.firstName || '',
        lastName: user.profileInfo?.lastName || '',
        city: user.profileInfo?.city || '',
        bio: user.profileInfo?.bio || '',
        profilePhoto: user.profileInfo?.profilePhoto || 'defaultAvatar.png',
      },
    };

    // Active threads authored by user
    const threads = await Thread.find({
      authorId: user._id,
      status: 'active',
    })
      .sort({ lastActivity: -1 })
      .select('_id title status lastActivity');

    return { user, safeProfile, threads };
  }

  // Update profile
  async updateProfile(userId, profileData, profilePhotoFile) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const currentPhoto = user.profileInfo.profilePhoto;

      // Sanitize: accept only whitelisted fields and validate input
      const { firstName, lastName, city, bio, facebook, instagram } =
        profileData || {};

      // Validate and sanitize string fields
      const sanitizedData = {
        firstName: this.sanitizeString(firstName, 50),
        lastName: this.sanitizeString(lastName, 50),
        city: this.sanitizeString(city, 100),
        bio: this.sanitizeString(bio, 500),
        facebook: this.sanitizeUrl(facebook),
        instagram: this.sanitizeUrl(instagram),
      };

      const update = {
        "profileInfo.firstName": sanitizedData.firstName,
        "profileInfo.lastName": sanitizedData.lastName,
        "profileInfo.city": sanitizedData.city,
        "profileInfo.bio": sanitizedData.bio,
        "profileInfo.facebook": sanitizedData.facebook,
        "profileInfo.instagram": sanitizedData.instagram,
      };

      //Delete existing photo
      if (profilePhotoFile) {
        if (
          currentPhoto &&
          currentPhoto !== "" &&
          currentPhoto !== "defaultAvatar.png"
        ) {
          const photoPath = path.join(
            __dirname,
            "../../public/uploads/profilePicture",
            currentPhoto
          );
          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
          }
        }

        update["profileInfo.profilePhoto"] = profilePhotoFile.filename;
      }

      const updatedUser = await User.findByIdAndUpdate(userId, update, {
        new: true,
      });
      return updatedUser;
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // List bookings (with status)
  async getBookings(userId, page, limit) {
    const skip = (page - 1) * limit;

    const totalBookings = await Booking.countDocuments({ userID: userId });
    const totalPages = Math.ceil(totalBookings / limit);

    const bookings = await Booking.find({ userID: userId })
      .populate("tourID", "title location images itinerary")
      .populate("guideID", "profileInfo.firstName profileInfo.lastName")
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const bookingData = bookings.map((b) => ({
      id: b._id,
      tourId: b.tourID?._id || null,
      userId: b.userID || userId,
      tourTitle: b.tourID?.title || "Untitled Tour",
      itinerary: b.tourID?.itinerary || "",
      location: b.tourID?.location || "Unknown",
      image: b.tourID?.images[0] || "default-tour.jpg",
      guideName: b.guideID
        ? `${b.guideID.profileInfo.firstName} ${b.guideID.profileInfo.lastName}`
        : "Unknown Guide",
      tourDate: b.tourDate,
      pricing: b.pricing,
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

  // Cancel booking (only tour guides)
  async cancelBooking(bookingId, userId, role) {
    if (role !== "tourguide") {
      throw new Error("Only tour guides can cancel bookings.");
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error("Booking not found");

    booking.status = "cancelled";
    await booking.save();
  }

  async deactivateAccount(userId, reason) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    user.isActive = false;
    await user.save();
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          type: "account",
          message: "Your account was deactivated.",
          meta: { reason },
        },
      },
    });
  }

  // Get settings
  async getSettings(userId) {
    const user = await User.findById(userId).select("-password");
    if (!user) throw new Error("User not found");

    return {
      email: user.email,
      accountType: user.role,
      phone: user.profileInfo.phone,
      isActive: user.isActive,
      theme: user.theme || "light",
    };
  }
  // Update password (for profile settings)
  async updatePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new Error("Current password is incorrect");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          type: "account",
          message: "Your password was changed.",
          meta: {},
        },
      },
    });
  }

  // Admin functions
  async lockUser(userId) {
    const user = await User.findById(userId);
    if (!user || user.role === "admin") throw new Error("Invalid user");
    user.isLocked = true;
    await user.save();
    return user;
  }

  async verifyGuide(userId, fileUrl, expiryDate) {
    const user = await User.findById(userId);
    if (!user || !user.guideInfo) throw new Error("Invalid guide");
    user.guideInfo.certifications.push({
      verificationPhoto: fileUrl,
      isVerified: true,
      verifiedAt: new Date(),
      expiryDate,
    });
    await user.save();
    return user;
  }

  async getOverviewStats() {
    const [total, guides, pending, banned, mods] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "tourguide" }),
      User.countDocuments({ "guideInfo.certifications.isVerified": false }),
      User.countDocuments({ isLocked: true }),
      User.countDocuments({ role: "admin" }),
    ]);
    return { total, guides, pending, banned, mods };
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

  async updateTheme(userId, theme) {
    const user = await User.findByIdAndUpdate(userId, { theme }, { new: true });
    if (!user) throw new Error("User not found");
    return user.theme;
  }

  async saveTour(userId, tourId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Remove all existing entries for this tour to prevent duplicates
    user.savedTours = user.savedTours.filter(
      (t) => t.tourId.toString() !== tourId
    );

    // Add new saved tour entry
    user.savedTours.push({
      tourId,
      status: "active",
      savedAt: new Date(),
    });

    await user.save();
    return user.savedTours;
  }

  async removeSavedTour(userId, tourId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Remove the tour from saved tours completely
    user.savedTours = user.savedTours.filter(
      (t) => t.tourId.toString() !== tourId
    );

    await user.save();
    return user.savedTours;
  }

  async getSavedTours(userId, page = 1, limit = 5) {
    const user = await User.findById(userId).populate("savedTours.tourId");
    if (!user) throw new Error("User not found");

    // Filter only active saved tours and return populated tour objects
    const activeSavedTours = user.savedTours
      .filter((saved) => saved.status === "active" && saved.tourId)
      .map((saved) => saved.tourId)
      .filter((tour) => tour); // Remove any null/undefined tours

    const total = activeSavedTours.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const savedTours = activeSavedTours.slice(startIndex, endIndex);

    return {
      savedTours,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    };
  }
}

module.exports = new UserService();
