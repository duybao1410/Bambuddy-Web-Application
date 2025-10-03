const mongoose = require('mongoose');
const { Schema } = mongoose;
const { User } = require('./userSchema');
const { Tour } = require('./tourSchema');

const ratingSchema = new Schema({
  tourId: { type: Schema.Types.ObjectId, ref: 'Tour', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  count: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, default: '' }
});

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = { Rating };