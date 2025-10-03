const mongoose = require('mongoose');
const Tour = require('./tourSchema');

const bookingSchema = new mongoose.Schema({
  tourID: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  guideID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookingDate: { type: Date, default: Date.now },
  tourDate: { type: String, required: true }, // Khớp với availability.date (lưu dạng "2025-08-15")
  pricing: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;


