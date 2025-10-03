const mongoose = require('mongoose');
const { Schema } = mongoose;

const threadSchema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: false /*same here */ },
  title: { 
    type: String, 
    required: true, 
    trim: true,
    maxLength: 200 // Prevent extremely long titles
  },
  content: { 
    type: String, 
    required: true, 
    trim: true,
    maxLength: 10000 // Reasonable content limit
  },
  // Separate like/dislike counts for better clarity
  likeCount: { type: Number, default: 0, min: 0 },
  dislikeCount: { type: Number, default: 0, min: 0 },
  
  // NEW: Track user reactions to prevent multiple likes/dislikes
  reactions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['like', 'dislike'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Better handling of media
  attachments: { type: [String], default: [] },
  
  // Improved tags with validation
  tags: { 
    type: [String], 
    default: [],
    validate: [
    {
      validator: function(tags) {
        return tags.length <= 10; // Max 10 tags
      },
      message: 'Maximum 10 tags allowed'
    },
    {
      validator: function(tags) {
        return tags.every(tag => tag.length <= 10); // Max 10 characters per tag
      },
      message: 'Each tag must be 10 characters or fewer'
    }
    ]
  },
  
  // Reference to comments instead of embedding (better for large threads)
  commentCount: { type: Number, default: 0 },
  
  // Additional useful fields
  viewCount: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false }, // Prevent new comments
  
  // Category/forum organization
  category: { type: String, trim: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }, // Last comment/update
  
  status: { 
    type: String, 
    enum: ['pending', 'active', 'rejected', 'deleted', 'hidden', 'archived'], 
    default: 'pending' 
  },
  rejectionReason: { type: String }
});

// Indexes for better performance
threadSchema.index({ authorId: 1 });
threadSchema.index({ createdAt: -1 });
threadSchema.index({ lastActivity: -1 });
threadSchema.index({ tags: 1 });
threadSchema.index({ category: 1 });
threadSchema.index({ status: 1 });

// NEW: Index for reactions to ensure efficient queries
threadSchema.index({ 'reactions.userId': 1 });

// Compound indexes for common queries
threadSchema.index({ status: 1, createdAt: -1 });
threadSchema.index({ category: 1, lastActivity: -1 });

// NEW: Compound index to prevent duplicate reactions per user per thread
// This ensures each user can only have one reaction per thread
threadSchema.index({ _id: 1, 'reactions.userId': 1 }, { unique: true, sparse: true });

// Pre-save middleware to update timestamps
threadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// NEW: Virtual to get user's reaction type (useful for queries)
threadSchema.methods.getUserReaction = function(userId) {
  const reaction = this.reactions.find(r => r.userId.toString() === userId.toString());
  return reaction ? reaction.type : null;
};

// NEW: Method to check if user has reacted
threadSchema.methods.hasUserReacted = function(userId) {
  return this.reactions.some(r => r.userId.toString() === userId.toString());
};

const Thread = mongoose.model('Thread', threadSchema);

module.exports = { Thread };