const threadService = require('../services/threadService');
const path = require("path");
const fs = require('fs').promises;
const { Thread } = require('../models/threadSchema');


class ThreadController {
  // Main Thread Page - Display all threads
  // Main Thread Page
async getMainPage(req, res) {
  try {
    const { page = 1, limit = 10, sort = 'lastActivity', category } = req.query;
    let result;

    if (category) {
      result = await threadService.getThreadsByCategory(category, page, limit);
    } else {
      result = await threadService.getAllThreads(page, limit, sort);
    }

    const tags = await Thread.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);

    res.render('forum/mainPage', {
      threads: result.threads,
      pagination: result.pagination,
      query: "",
      sort: "relevance",
      tags: tags,
    });
  } catch (error) {
    res.status(500).render('error', { message: error.message });
  }
}



  // Thread Detail Page - Show full thread with comments
  async getThreadDetail(req, res) {
  try {
    const { threadId } = req.params;
    const result = await threadService.getThreadById(threadId);

    res.render("forum/threadDetail", {
      thread: result.thread,
      comments: result.comments,
      pagination: result.pagination,

    });
  } catch (error) {
    res.render("forum/error", { message: error.message });
  }
}

  // Search Page - Search threads
  async searchThreads(req, res) {
    try {
      const { 
        q: query, 
        page = 1, 
        limit = 20, 
        category,
        tags,
        author,
        sort = 'relevance'
      } = req.query;

      if (query && query.trim().length < 2) {
        return res.status(400).render('forum/search', {
          error: 'Search query must be at least 2 characters long',
          query,
          category: category || '',
          tags: tags || '',
          author: author || '',
          sort,
          user: req.user || null
        });
      }

      const filters = {
        category,
        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        author,
        sortBy: sort
      };

      const result = await threadService.searchThreads(query, filters, page, limit);

      res.render('forum/searchThreads', {
        data: result,
        error: null, // Explicitly set error to null on success
        query: query || '',
        category: category || '',
        tags: tags || '',
        author: author || '',
        sort,
        
      });
    } catch (error) {
      res.status(500).render('forum/searchThreads', {
        error: error.message,
        query: query || '',
        category: category || '',
        tags: tags || '',
        author: author || '',
        sort: sort || 'relevance',
        user: req.user || null
      });
    }
  }

  // Create new thread
  async createThread(req, res) {
    try {
      const { title, content, tags = [], category } = req.body;
      const authorId = req.user.id; // Assuming user is authenticated

      let attachments = [];
      if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => path.posix.join("uploads/threads", file.filename)); // Store file paths
      } else if (req.body.attachments) {
        // fallback for non-file uploads
        attachments = Array.isArray(req.body.attachments)
          ? req.body.attachments
          : [req.body.attachments];
      }

      // Validation
      if (!title || !content) {
      // Remove uploaded files if validation fails
      if (attachments.length > 0) {
        attachments.forEach(filePath => {
          fs.unlink(filePath, err => {
            if (err) console.error("Error deleting file:", filePath, err);
          });
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

      if (title.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Title must be less than 200 characters'
        });
      }

      if (content.length > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Content must be less than 10000 characters'
        });
      }
      let tagArray = [];
      if (typeof tags === 'string') {
        tagArray = tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        tagArray = tags
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      }

      // Validation: no tag longer than 10 chars
      if (tagArray.some(tag => tag.length > 10)) {
        return res.status(400).json({
          success: false,
          message: 'Each tag must be 10 characters or fewer'
        });
      }

      tagArray = tagArray.slice(0, 10); // enforce max 10 tags



      const threadData = {
        title: title.trim(),
        content: content.trim(),
        authorId,
        tags: tagArray.slice(0, 10), // limit to 10 tags
        category: category?.trim(),
        attachments
      };


      const thread = await threadService.createThread(threadData);

      // Redirect with pending toast indicator (no DB notification)
      res.redirect('/threads?pending=1');
      // REMINDER: Apply react after redirect to notify that thread created successfully
      // res.status(201).json({
      //   success: true,
      //   message: 'Thread created successfully',
      //   data: thread
      // });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

// Manage Posts Page - Get user's threads
// Manage Posts Page - Get user's threads
async getUserThreads(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user.id;

    const result = await threadService.getUserThreads(userId, page, limit);

    res.render("forum/myThreads", {
      threads: result.threads,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).render("error", { message: error.message });
  }
}


  // Update thread
  async updateThread(req, res) {
    try {
      const { threadId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      if (updateData.title && updateData.title.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Title must be less than 200 characters'
        });
      }

      if (updateData.content && updateData.content.length > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Content must be less than 10000 characters'
        });
      }
    
      if (updateData.tags) {
        if (typeof updateData.tags === "string") {
          updateData.tags = updateData.tags
            .split(",")
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        }
      }

      const thread = await threadService.updateThread(threadId, userId, updateData);
      res.redirect('/threads/my-posts');
    } catch (error) {
      if (error.message === 'Thread not found or unauthorized') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Render edit thread page
async getEditThreadPage(req, res) {
  try {
    const { threadId } = req.params;
    const userId = req.user.id;

    

    const result = await threadService.getThreadById(threadId);
    

    if (!result.thread) {
      
      return res.status(404).render("error", { 
        message: "Thread not found",
        user: req.user 
      });
    }

    // Make sure user owns the thread
    if (result.thread.authorId._id.toString() !== userId.toString()) {
      
      return res.status(403).render("error", { 
        message: "Unauthorized access",
        user: req.user 
      });
    }

    res.render("forum/editThread", { 
      thread: result.thread, 
      
    });
  } catch (error) {
    console.error('Error in getEditThreadPage:', error);
    res.status(500).render("error", { 
      message: error.message,

    });
  }
}


  // Delete thread (soft delete)
  async deleteThread(req, res) {
    try {
      const { threadId } = req.params;
      const userId = req.user.id;

      const result = await threadService.deleteThread(threadId, userId);

      res.redirect('/threads/my-posts');
    } catch (error) {
      if (error.message === 'Thread not found or unauthorized') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Hide thread
  async hideThread(req, res) {
    try {
      const { threadId } = req.params;
      const userId = req.user.id;

      const result = await threadService.hideThread(threadId, userId);

      // Redirect back to my posts page after successful hide
      res.redirect('/threads/my-posts');
    } catch (error) {
      console.error('Hide thread error:', error);
      res.status(500).render("error", { 
        message: error.message,
        user: req.user || null 
      });
    }
  }

    // Unhide thread
    async unhideThread(req, res) {
      try {
        const { threadId } = req.params;
        const userId = req.user.id;

        const result = await threadService.unhideThread(threadId, userId);

        // Redirect back to my posts page after successful unhide
        res.redirect('/threads/my-posts');
      } catch (error) {
        console.error('Unhide thread error:', error);
        res.status(500).render("error", { 
          message: error.message,
          user: req.user || null 
        });
      }
    }

  // Like/Dislike thread
  async toggleThreadReaction(req, res) {
  try {
    const { threadId } = req.params;
    const { action } = req.body; // 'like' or 'dislike'
    const userId = req.user.id;

    if (!['like', 'dislike'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "like" or "dislike"'
      });
    }

    const result = await threadService.toggleThreadLike(threadId, userId, action);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Thread not found' || error.message === 'Invalid thread ID') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Invalid action')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

  // Add comment to thread
  async addComment(req, res) {
    try {
      const { threadId } = req.params;
      const { content, parentCommentId = null } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        if (req.file) {
          await fs.unlink(req.file.path).catch(err => console.error("Error deleting file:", req.file.path, err));
        }
        return res.status(400).json({
          success: false,
          message: 'Comment content is required'
        });
      }

      if (content.length > 5000) {
        if (req.file) {
          await fs.unlink(req.file.path).catch(err => console.error("Error deleting file:", req.file.path, err));
        }
        return res.status(400).json({
          success: false,
          message: 'Comment must be less than 5000 characters'
        });
      }

      let postPhoto = '';
        if (req.file) {
          postPhoto = path.posix.join("uploads/posts", req.file.filename);
        } else if (req.body.postPhotos) {
          postPhoto = req.body.postPhotos;
        }

      const comment = await threadService.addComment(
        threadId, 
        userId, 
        content.trim(), 
        parentCommentId,
        postPhoto
      );
      
      // For AJAX requests, return JSON instead of redirect
      if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.json({
          success: true,
          data: {
            comment: comment,
            threadId: threadId,
            parentCommentId: parentCommentId
          }
        });
      }
      
      return res.redirect(
      `/threads/${threadId}${parentCommentId ? `?highlightComment=${comment._id}` : `#comment-${comment._id}`}`
      );
    } catch (error) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(err => console.error("Error deleting file:", req.file.path, err));
      }
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get popular tags (Side bars bên tay phải)
  async getPopularTags(req, res) {
    try {
      const { Thread } = require('../models/threadSchema');
      
      const tags = await Thread.aggregate([
        { $match: { status: 'active' } },
        { $unwind: '$tags' },
        { $match: { $expr: { $lte: [ { $strLenCP: "$tags" }, 10 ] } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { tag: '$_id', count: 1, _id: 0 } }
      ]);

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  // Toggle like/dislike on comment
  async toggleCommentReaction(req, res) {
    try {
      const { commentId } = req.params;
      const { action } = req.body;
      const userId = req.user.id;

      if (!['like', 'dislike'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use "like" or "dislike"'
        });
      }

      const result = await threadService.toggleCommentReaction(commentId, userId, action);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

// Soft delete comment
  async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      const result = await threadService.softDeleteComment(commentId, userId);

      res.redirect(`/threads/${result.threadId}`);
    } catch (error) {
      console.error(error);
      res.redirect("/threads");
    }
  }

}

module.exports = new ThreadController();