const mongoose = require("mongoose");
const { Schema } = mongoose;

// Availability schema: mỗi ngày có 1 slot, đánh dấu đã đặt hay chưa
const availabilitySchema = new Schema({
  date: { type: String, required: true }, // ví dụ: '2025-08-12'
  isBooked: { type: Boolean, default: false }, // false: còn slot, true: đã hết slot (đã đặt)
});

// Tour schema
const tourSchema = new Schema(
  {
    guideId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      placeId: { type: String },
    },
    durationMinutes: { type: Number, required: true },
    category: { type: [String], required: true },
    pricing: { type: Number, required: true },
    images: { type: [String], default: [] },

    availability: { type: [availabilitySchema], default: [] }, // Các ngày có thể đặt tour

    itinerary: { type: String, default: "" }, // Toàn bộ lịch trình tour dưới dạng chuỗi
    deletedAt: { type: Date, default: null }, // Timestamp when soft-deleted
    isActive: { type: Boolean, default: true },
    rating: [{ type: Schema.Types.ObjectId, ref: "Rating" }],
    averageRating: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
const Tour = mongoose.model("Tour", tourSchema);

module.exports = { Tour };
