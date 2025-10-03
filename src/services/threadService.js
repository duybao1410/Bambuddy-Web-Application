const { Thread } = require('../models/threadSchema');
const { ThreadComment } = require('../models/postSchema');
const { User } = require("../models/userSchema");
const mongoose = require('mongoose');

class ThreadService {
  // Main Thread Page - Get all threads with pagination
  async getAllThreads(page = 1, limit = 10, sortBy = 'lastActivity') {
    try {
      const skip = (page - 1) * limit;
      const sortOptions = {
        'latest': { createdAt: -1 },
        'lastActivity': { lastActivity: -1 },
        'popular': { likeCount: -1, commentCount: -1 },
        'mostLiked': { likeCount: -1 },
        'mostCommented': { commentCount: -1 }
      };

      const threads = await Thread.find({ status: 'active' })
        .populate({
          path: 'authorId',
          select: 'profileInfo isActive isLocked',
          match: { isActive: true, isLocked: false }
        })
        .select('title authorId createdAt lastActivity likeCount dislikeCount commentCount viewCount tags category isPinned')
        .sort(sortOptions[sortBy] || sortOptions.lastActivity)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Filter out threads where authorId is null (user is banned/deactivated)
      const filteredThreads = threads.filter(thread => thread.authorId !== null);

      const totalThreads = await Thread.countDocuments({ 
        status: 'active',
        authorId: { $in: await User.find({ isActive: true, isLocked: false }).distinct('_id') }
      });
      const totalPages = Math.ceil(totalThreads / limit);

      return {
        threads: filteredThreads,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalThreads,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Error fetching threads: ${error.message}`);
    }
  }

  // Get threads by category with user filtering
  async getThreadsByCategory(category, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const threads = await Thread.find({ 
        status: 'active',
        category: category 
      })
        .populate({
          path: 'authorId',
          select: 'profileInfo isActive isLocked',
          match: { isActive: true, isLocked: false }
        })
        .select('title authorId createdAt lastActivity likeCount dislikeCount commentCount viewCount tags category isPinned')
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Filter out threads where authorId is null (user is banned/deactivated)
      const filteredThreads = threads.filter(thread => thread.authorId !== null);

      const totalThreads = await Thread.countDocuments({ 
        status: 'active',
        category: category,
        authorId: { $in: await User.find({ isActive: true, isLocked: false }).distinct('_id') }
      });
      const totalPages = Math.ceil(totalThreads / limit);

      return {
        threads: filteredThreads,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalThreads,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Error fetching threads by category: ${error.message}`);
    }
  }

  // Thread Detail Page - Get single thread with comments (trang độc lập khi ấn vào title ở trang chính)
  async getThreadById(threadId, page = 1, limit = 10) {
    try {
      if (!mongoose.Types.ObjectId.isValid(threadId)) {
        throw new Error('Invalid thread ID');
      }

      const thread = await Thread.findOneAndUpdate(
        { _id: threadId, status: 'active' },
        { $inc: { viewCount: 1 } },
        { new: true }
      )
        .populate({
          path: 'authorId',
          match: { isActive: true, isLocked: false }
        })
        .lean();

      if (!thread || !thread.authorId) {
        throw new Error('Thread not found or author is inactive');
      }

      const skip = (page - 1) * limit;

      const comments = await ThreadComment.find({
        threadId: threadId,
        status: 'active',
        parentComment: null
      })
        .populate({
          path: 'authorId',
          match: { isActive: true, isLocked: false }
        })
        .populate({
          path: 'replies',
          populate: { 
            path: 'authorId',
            match: { isActive: true, isLocked: false }
          },
          match: { status: 'active' }
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Filter out comments from banned/deactivated users
      const filteredComments = comments.filter(comment => comment.authorId !== null);

      const totalComments = await ThreadComment.countDocuments({
        threadId: threadId,
        status: 'active',
        parentComment: null,
        authorId: { $in: await User.find({ isActive: true, isLocked: false }).distinct('_id') }
      });

      return {
        thread,
        comments: filteredComments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalComments / limit),
          totalComments
        }
      };
    } catch (error) {
      throw new Error(`Error fetching thread: ${error.message}`);
    }
  }

// Search threads with filters and pagination
  async searchThreads(query, filters = {}, page = 1, limit = 20) {
  try {
    const { category, tags, author, sortBy = 'relevance' } = filters;
    const skip = (page - 1) * limit;

    let searchCriteria = { status: 'active' };

    if (query && query.trim()) {
      searchCriteria.$or = [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ];
    }

    // Exact filters
    if (category) searchCriteria.category = category;
    if (tags && tags.length > 0) {
      searchCriteria.tags = { $in: tags };
    }
    if (author) searchCriteria.authorId = author;

    // Updated sort options
    const sortOptions = {
      relevance: { createdAt: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { likeCount: -1, commentCount: -1 },
      mostLiked: { likeCount: -1 },
      mostCommented: { commentCount: -1 },
      lastActivity: { lastActivity: -1 }
    };

    const threads = await Thread.find(searchCriteria)
      .populate({
        path: 'authorId',
        select: 'profileInfo isActive isLocked',
        match: { isActive: true, isLocked: false }
      })
      .select('title content authorId createdAt likeCount dislikeCount commentCount viewCount tags category lastActivity')
      .sort(sortOptions[sortBy] || sortOptions.relevance)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Filter out threads where authorId is null (user is banned/deactivated)
    const filteredThreads = threads.filter(thread => thread.authorId !== null);

    const totalResults = await Thread.countDocuments({
      ...searchCriteria,
      authorId: { $in: await User.find({ isActive: true, isLocked: false }).distinct('_id') }
    });

    return {
      threads: filteredThreads,
      query,
      filters,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalResults / limit),
        totalResults
      }
    };
  } catch (error) {
    throw new Error(`Error searching threads: ${error.message}`);
  }
}

  // Create new thread
  async createThread(threadData) {
    try {
      const thread = new Thread({ ...threadData, status: 'pending' });
      await thread.save();
      return await Thread.findById(thread._id)
        .populate('authorId', 'username avatar')
        .lean();
    } catch (error) {
      throw new Error(`Error creating thread: ${error.message}`);
    }
  }

  // Get user's threads for management
// Get user's threads for management
async getUserThreads(userId, page = 1, limit = 10) {
  try {
    const skip = (page - 1) * limit;

    const query = { 
      authorId: userId,
      status: { $ne: 'deleted' } 
    };

    const [userDoc, threads, totalThreads] = await Promise.all([
      User.findById(userId).lean(),
      Thread.find(query)
        .select('title content createdAt updatedAt likeCount dislikeCount commentCount viewCount status rejectionReason tags category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Thread.countDocuments(query)
    ]);

    const user = userDoc ? {
      fullName: `${userDoc.profileInfo?.firstName || ''} ${userDoc.profileInfo?.lastName || ''}`.trim() || 'Anonymous',
      email: userDoc.email || 'noemail@example.com',
      profilePicture: userDoc.profileInfo?.profilePhoto || null,
      theme: userDoc.theme || 'light'
    } : null;

    const totalPages = Math.ceil(totalThreads / limit);

    return {
      threads,
      user,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalThreads,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    throw new Error(`Error fetching user threads: ${error.message}`);
  }
}




  // Update thread
  async updateThread(threadId, userId, updateData) {
  try {
    const allowedUpdates = ['title', 'content', 'tags', 'category'];
    const updates = {};
    
    // Filter allowed updates
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    updates.updatedAt = new Date();

    const thread = await Thread.findOneAndUpdate(
      { 
        _id: threadId, 
        authorId: userId,
        status: { $nin: ['deleted', 'pending'] }
      },
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!thread) {
      throw new Error('Thread not found or unauthorized or deleted');
    }

    return thread;
  } catch (error) {
    throw new Error(`Error updating thread: ${error.message}`);
  }
}


  // Delete thread (soft delete)
  async deleteThread(threadId, userId) {
    try {
      const thread = await Thread.findOneAndUpdate(
        { _id: threadId, authorId: userId, status: { $ne: 'pending' } },
        { status: 'deleted', updatedAt: new Date() },
        { new: true }
      ).lean();

      if (!thread) {
        throw new Error('Thread not found or unauthorized or deleted');
      }

      return { message: 'Thread deleted successfully' };
    } catch (error) {
      throw new Error(`Error deleting thread: ${error.message}`);
    }
  }

  // Hide thread
  async hideThread(threadId, userId) {
    try {
      const thread = await Thread.findOneAndUpdate(
        { _id: threadId, authorId: userId, status: 'active' },
        { status: 'hidden', updatedAt: new Date() },
        { new: true }
      ).lean();

      if (!thread) {
        throw new Error('Thread not found or unauthorized or deleted');
      }

      return { message: 'Thread hidden successfully' };
    } catch (error) {
      throw new Error(`Error hiding thread: ${error.message}`);
    }
  }

  //Unhide thread
  async unhideThread(threadId, userId) {
    try {
      const thread = await Thread.findOneAndUpdate(
        { _id: threadId, authorId: userId, status: 'hidden' },
        { status: 'active', updatedAt: new Date() },
        { new: true }
      ).lean();

      if (!thread) {
        throw new Error('Thread not found or unauthorized or not hidden');
      }

      return { message: 'Thread unhidden successfully' };
    } catch (error) {
      throw new Error(`Error unhiding thread: ${error.message}`);
    }
  }

  // Like/Unlike thread
    async toggleThreadLike(threadId, userId, action) {
    try {
      if (!mongoose.Types.ObjectId.isValid(threadId)) {
        throw new Error('Invalid thread ID');
      }

      if (!['like', 'dislike'].includes(action)) {
        throw new Error('Invalid action. Use "like" or "dislike"');
      }

      // Find the thread
      const thread = await Thread.findOne({ 
        _id: threadId, 
        status: 'active' 
      });

      if (!thread) {
        throw new Error('Thread not found');
      }

      // Check if user already reacted to this thread
      const existingReaction = thread.reactions.find(
        reaction => reaction.userId.toString() === userId.toString()
      );

      let updateOperation = {};
      let message = '';

      if (existingReaction) {
        if (existingReaction.type === action) {
          // User is removing their reaction (toggle off)
          updateOperation = {
            $pull: { reactions: { userId: userId } },
            $inc: { 
              [action === 'like' ? 'likeCount' : 'dislikeCount']: -1 
            },
            lastActivity: new Date()
          };
          message = `${action} removed`;
        } else {
          // User is changing their reaction (like to dislike or vice versa)
          updateOperation = {
            $pull: { reactions: { userId: userId } }
          };
          
          // First remove old reaction
          await Thread.findByIdAndUpdate(threadId, updateOperation);
          
          // Then add new reaction
          updateOperation = {
            $push: { 
              reactions: { 
                userId: userId, 
                type: action,
                createdAt: new Date()
              } 
            },
            $inc: { 
              [action === 'like' ? 'likeCount' : 'dislikeCount']: 1,
              [existingReaction.type === 'like' ? 'likeCount' : 'dislikeCount']: -1
            },
            lastActivity: new Date()
          };
          message = `Changed to ${action}`;
        }
      } else {
        // User is adding a new reaction
        updateOperation = {
          $push: { 
            reactions: { 
              userId: userId, 
              type: action,
              createdAt: new Date()
            } 
          },
          $inc: { 
            [action === 'like' ? 'likeCount' : 'dislikeCount']: 1 
          },
          lastActivity: new Date()
        };
        message = `${action} added`;
      }

      const updatedThread = await Thread.findByIdAndUpdate(
        threadId,
        updateOperation,
        { new: true, runValidators: true }
      ).select('likeCount dislikeCount reactions').lean();

      // Get user's current reaction status
      const userReaction = updatedThread.reactions.find(
        reaction => reaction.userId.toString() === userId.toString()
      );

      return {
        likeCount: updatedThread.likeCount,
        dislikeCount: updatedThread.dislikeCount,
        userReaction: userReaction ? userReaction.type : null,
        message: message
      };

    } catch (error) {
      throw new Error(`Error updating thread reaction: ${error.message}`);
    }
  }

  // Add comment to thread
  async addComment(threadId, userId, content, parentCommentId = null, postPhoto = '') {
    try {
      const comment = new ThreadComment({
        threadId,
        authorId: userId,
        content,
        postPhotos: postPhoto,
        parentComment: parentCommentId,
        status: 'active'
      });

      await comment.save();

      // Do not increment visible comment count until approved

      if (parentCommentId) {
        await ThreadComment.findByIdAndUpdate(parentCommentId, {
          $push: { replies: comment._id }
        });
      }

      return await ThreadComment.findById(comment._id)
        .populate('authorId', 'username avatar')
        .lean();
    } catch (error) {
      throw new Error(`Error adding comment: ${error.message}`);
    }
  }
async toggleCommentReaction(commentId, userId, action) {
  try {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new Error('Invalid comment ID');
    }
    if (!['like', 'dislike'].includes(action)) {
      throw new Error('Invalid action. Use "like" or "dislike"');
    }

    const comment = await ThreadComment.findById(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    const existingReaction = comment.reactions.find(
      r => r.userId.toString() === userId.toString()
    );

    let updateOperation = {};
    let message = '';

    if (existingReaction) {
      if (existingReaction.type === action) {
        // Toggle off
        updateOperation = {
          $pull: { reactions: { userId: userId } },
          $inc: { [action === 'like' ? 'likes' : 'dislikes']: -1 }
        };
        message = `${action} removed`;
      } else {
        // Change reaction
        updateOperation = {
          $set: { 'reactions.$.type': action },
          $inc: {
            [action === 'like' ? 'likes' : 'dislikes']: 1,
            [existingReaction.type === 'like' ? 'likes' : 'dislikes']: -1
          }
        };
        await ThreadComment.updateOne(
          { _id: commentId, 'reactions.userId': userId },
          updateOperation
        );
        const updated = await ThreadComment.findById(commentId).lean();
        return {
          likes: updated.likes,
          dislikes: updated.dislikes,
          userReaction: action,
          threadId: updated.threadId,
          message: `Changed to ${action}`
        };
      }
    } else {
      // Add new reaction
      updateOperation = {
        $push: { reactions: { userId, type: action, createdAt: new Date() } },
        $inc: { [action === 'like' ? 'likes' : 'dislikes']: 1 }
      };
      message = `${action} added`;
    }

    const updatedComment = await ThreadComment.findByIdAndUpdate(
      commentId,
      updateOperation,
      { new: true }
    ).lean();

    const userReaction = updatedComment.reactions.find(
      r => r.userId.toString() === userId.toString()
    );

    return {
      likes: updatedComment.likes,
      dislikes: updatedComment.dislikes,
      userReaction: userReaction ? userReaction.type : null,
      threadId: updatedComment.threadId,
      message
    };
  } catch (error) {
    throw new Error(`Error toggling comment reaction: ${error.message}`);
  }
}

// Soft delete comment
async softDeleteComment(commentId, userId) {
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new Error("Invalid comment ID");
  }

  const comment = await ThreadComment.findById(commentId);
  if (!comment) throw new Error("Comment not found");

  // Only author or admin can delete
  if (comment.authorId.toString() !== userId.toString()) {
    throw new Error("Not authorized to delete this comment");
  }

  // Soft delete the parent comment
  comment.status = "deleted";
  comment.content = "[deleted]";
  await comment.save();

  await ThreadComment.updateMany(
    { parentComment: comment._id, status: "active" },
    { $set: { status: "deleted", content: "[deleted]" } }
  );

  return { threadId: comment.threadId };
}



}

module.exports = new ThreadService();