const mongoose = require('mongoose');
const { Schema } = mongoose;


const feedbackSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  feedbackType: {
    type: String,
    enum: ["general", "bug", "feature", "complaint", "compliment"],
    required: true,
  },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;