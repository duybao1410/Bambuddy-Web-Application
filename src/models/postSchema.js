const mongoose = require('mongoose');
const { Schema } = mongoose;

const threadCommentSchema = new Schema({
  threadId: { type: Schema.Types.ObjectId, ref: 'Thread', required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  content: { type: String, required: true, trim: true },
  postPhotos: { type: String, default: '' },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'active', 'deleted', 'hidden'], default: 'pending' },
  parentComment: { type: Schema.Types.ObjectId, ref: 'ThreadComment' },
  replies: [{ type: Schema.Types.ObjectId, ref: 'ThreadComment' }],

  reactions: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      type: { type: String, enum: ['like', 'dislike'] },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});


const ThreadComment = mongoose.model('ThreadComment', threadCommentSchema);
module.exports = { ThreadComment };
