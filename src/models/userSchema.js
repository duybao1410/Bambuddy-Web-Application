const mongoose = require("mongoose");
const { Schema } = mongoose;

// Embedded Profile Info
const profileInfoSchema = new Schema({
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  city: { type: String, default: "" },
  bio: { type: String, default: "" },
  profilePhoto: { type: String, default: "defaultAvatar.png" },
  phone: { type: String, default: "" },
  facebook: { type: String, default: "" },
  instagram: { type: String, default: "" },
});

// Embedded Guide Info
const guideInfoSchema = new Schema({
  professionalTitle: { type: String, default: "" },
  languages: { type: [String], default: [] },
  specializations: { type: [String], default: [] },
  certifications: [
    {
      verificationPhoto: { type: String, default: "" },
      isVerified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      createdAt: { type: Date, default: Date.now },
      approvals: [
        {
          admin: { type: String },
          date: { type: Date, default: Date.now },
        },
      ],
      rejection: {
        reason: { type: String, default: "" },
        at: { type: Date },
      },
    },
  ],
});

// Saved Tour subdocument
const saveTour = new Schema({
  tourId: { type: Schema.Types.ObjectId, ref: "Tour" },
  status: { type: String, enum: ["active", "removed"], default: "active" },
  savedAt: { type: Date, default: Date.now },
});

// User Schema
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function () {
        return !this.googleId; //require password only(no Google OAuth status)
      },
    },
    googleId: { type: String, unique: true, sparse: true },
    role: {
      type: String,
      enum: ["user", "tourguide", "admin"],
      default: "user",
    },
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    isFlagged: { type: Boolean, default: false },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    signupToken: { type: String },
    signupTokenCreatedAt: { type: Date },
    signupTokenRevealed: { type: Boolean, default: false },
    notifications: [
      {
        type: {
          type: String,
          enum: ["certificate", "account", "moderation", "system"],
          default: "system",
        },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
        meta: { type: Object, default: {} },
      },
    ],
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    profileInfo: profileInfoSchema,
    guideInfo: { type: guideInfoSchema, default: null },
    savedTours: [saveTour],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = { User };
