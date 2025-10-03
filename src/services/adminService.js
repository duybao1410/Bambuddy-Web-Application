const { User } = require('../models/userSchema');
const { Thread } = require('../models/threadSchema');
const { ThreadComment } = require('../models/postSchema');



/* Get dashboard statistics */
const getDashboardStats = async () => {
  try {
    // Get user counts by role and status
    const userStats = await User.aggregate([
      {
        $group: {
          _id: { role: '$role', isActive: '$isActive', isLocked: '$isLocked' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get certificate stats (approved, pending, rejected)
    const certificateAgg = await User.aggregate([
      { $match: { 'guideInfo.certifications': { $exists: true, $ne: [] } } },
      { $unwind: '$guideInfo.certifications' },
      {
        $group: {
          _id: null,
          approved: {
            $sum: {
              $cond: [ { $eq: ['$guideInfo.certifications.isVerified', true] }, 1, 0 ]
            }
          },
          rejected: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$guideInfo.certifications.isVerified', true] },
                  { $gt: [ { $strLenCP: { $ifNull: ['$guideInfo.certifications.rejection.reason', ''] } }, 0 ] }
                ] },
                1,
                0
              ]
            }
          },
          pending: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$guideInfo.certifications.isVerified', true] },
                  { $eq: [ { $strLenCP: { $ifNull: ['$guideInfo.certifications.rejection.reason', ''] } }, 0 ] }
                ] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get thread and post stats for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threadStats = await Thread.aggregate([
      {
        $group: {
          _id: null,
          last7Days: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', sevenDaysAgo] }, 1, 0]
            }
          },
          today: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', today] }, 1, 0]
            }
          }
        }
      }
    ]);

    const postStats = await ThreadComment.aggregate([
      {
        $group: {
          _id: null,
          last7Days: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', sevenDaysAgo] }, 1, 0]
            }
          },
          today: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', today] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Process user stats
    const totals = {
      users: 0,
      tourguides: 0,
      admins: 0,
      deactivated: 0,
      locked: 0
    };

    userStats.forEach(stat => {
      const { role, isActive, isLocked } = stat._id;
      if (role === 'user') totals.users += stat.count;
      if (role === 'tourguide') totals.tourguides += stat.count;
      if (role === 'admin') totals.admins += stat.count;
      if (!isActive) totals.deactivated += stat.count;
      if (isLocked) totals.locked += stat.count;
    });

    // Process certificate stats
    const certificates = certificateAgg[0] || { pending: 0, approved: 0, rejected: 0 };

    // Process thread and post stats
    const threads = threadStats[0] || { last7Days: 0, today: 0 };
    const posts = postStats[0] || { last7Days: 0, today: 0 };

    return {
      totals,
      certificates,
      threads,
      posts
    };
  } catch (error) {
    throw new Error(`Failed to get dashboard stats: ${error.message}`);
  }
};

/* Set or unset a moderation flag on a user */
const setUserFlag = async (userId, flag, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isFlagged = Boolean(flag);
    await user.save();

    await pushNotification(userId, {
      type: 'moderation',
      message: flag ? 'Your account has been flagged by admin.' : 'Your account flag has been removed by admin.',
      meta: { adminId, isFlagged: user.isFlagged }
    });

    return user;
  } catch (error) {
    throw new Error(`Failed to update user flag: ${error.message}`);
  }
};

/* Get users with filtering and pagination */
const getUsersWithFilters = async (filters) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      active,
      locked,
      search,
      reportedMin
    } = filters;

    const query = {};

    // Apply filters
    if (role) query.role = role;
    if (active !== undefined) query.isActive = active === 'true';
    if (locked !== undefined) query.isLocked = locked === 'true';
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profileInfo.firstName': { $regex: search, $options: 'i' } },
        { 'profileInfo.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -signupToken -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(maxLimit)
        .lean(),
      User.countDocuments(query)
    ]);

    return {
      items: users,
      page: parseInt(page),
      limit: maxLimit,
      total
    };
  } catch (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }
};

/* Ban a user */
const banUser = async (userId, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isLocked = true;
    await user.save();

    // Add notification
    await pushNotification(userId, {
      type: 'account',
      message: 'Your account has been banned by admin.',
      meta: { adminId }
    });

    return user;
  } catch (error) {
    throw new Error(`Failed to ban user: ${error.message}`);
  }
};

/* Unban a user */
const unbanUser = async (userId, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isLocked = false;
    await user.save();

    // Add notification
    await pushNotification(userId, {
      type: 'account',
      message: 'Your account ban has been lifted.',
      meta: { adminId }
    });

    return user;
  } catch (error) {
    throw new Error(`Failed to unban user: ${error.message}`);
  }
};

/* Deactivate a user */
const deactivateUser = async (userId, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = false;
    await user.save();

    // Add notification
    await pushNotification(userId, {
      type: 'account',
      message: 'Your account has been deactivated by admin.',
      meta: { adminId }
    });

    return user;
  } catch (error) {
    throw new Error(`Failed to deactivate user: ${error.message}`);
  }
};

/* Activate a user */
const activateUser = async (userId, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = true;
    await user.save();

    // Add notification
    await pushNotification(userId, {
      type: 'account',
      message: 'Your account has been reactivated by admin.',
      meta: { adminId }
    });

    return user;
  } catch (error) {
    throw new Error(`Failed to activate user: ${error.message}`);
  }
};

/* List certificates with filtering */
const listCertificates = async (filters) => {
  try {
    const {
      status = 'pending',
      guideId,
      page = 1,
      limit = 20
    } = filters;

    const query = { 'guideInfo.certifications': { $exists: true, $ne: [] } };
    if (guideId) query._id = guideId;

    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const users = await User.find(query)
      .select('email profileInfo guideInfo.certifications')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(maxLimit)
      .lean();

    // Filter certificates based on status
    const filteredUsers = users.map(user => {
      const certifications = user.guideInfo.certifications.filter(cert => {
        if (status === 'pending') {
          return !cert.isVerified && !cert.rejection?.reason;
        } else if (status === 'approved') {
          return cert.isVerified;
        } else if (status === 'rejected') {
          return cert.rejection?.reason;
        }
        return true;
      });

      return {
        ...user,
        guideInfo: {
          ...user.guideInfo,
          certifications
        }
      };
    }).filter(user => user.guideInfo.certifications.length > 0);

    const total = await User.countDocuments(query);

    return {
      items: filteredUsers,
      page: parseInt(page),
      limit: maxLimit,
      total
    };
  } catch (error) {
    throw new Error(`Failed to list certificates: ${error.message}`);
  }
};

/* Approve a certificate */
const approveCertificate = async (userId, certificationId, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.guideInfo) {
      throw new Error('User or guide info not found');
    }

    const certification = user.guideInfo.certifications.id(certificationId);
    if (!certification) {
      throw new Error('Certificate not found');
    }

    certification.isVerified = true;
    certification.verifiedAt = new Date();
    certification.approvals.push({
      admin: adminId,
      date: new Date()
    });

    // Clear any previous rejection
    certification.rejection = { reason: '', at: null };

    await user.save();

    // Add notification
    await pushNotification(userId, {
      type: 'certificate',
      message: 'Your certificate was approved.',
      meta: { certificationId, adminId }
    });

    return certification;
  } catch (error) {
    throw new Error(`Failed to approve certificate: ${error.message}`);
  }
};

/* Reject a certificate */
const rejectCertificate = async (userId, certificationId, reason, adminId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.guideInfo) {
      throw new Error('User or guide info not found');
    }

    const certification = user.guideInfo.certifications.id(certificationId);
    if (!certification) {
      throw new Error('Certificate not found');
    }

    certification.isVerified = false;
    certification.rejection = {
      reason,
      at: new Date()
    };

    await user.save();

    // Add notification
    await pushNotification(userId, {
      type: 'certificate',
      message: 'Your certificate was rejected.',
      meta: { certificationId, reason, adminId }
    });

    return certification;
  } catch (error) {
    throw new Error(`Failed to reject certificate: ${error.message}`);
  }
};

/* Soft delete a thread */
const softDeleteThread = async (threadId, adminId) => {
  try {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    thread.status = 'deleted';
    await thread.save();

    // Add notification to thread author
    if (thread.authorId) {
      await pushNotification(thread.authorId, {
        type: 'moderation',
        message: 'Your thread was removed by admin.',
        meta: { threadId, adminId }
      });
    }

    return thread;
  } catch (error) {
    throw new Error(`Failed to delete thread: ${error.message}`);
  }
};

/* Restore a thread */
const restoreThread = async (threadId, adminId) => {
  try {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    thread.status = 'active';
    await thread.save();

    return thread;
  } catch (error) {
    throw new Error(`Failed to restore thread: ${error.message}`);
  }
};

/* Soft delete a post */
const softDeletePost = async (postId, adminId) => {
  try {
    const post = await ThreadComment.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    post.status = 'deleted';
    await post.save();

    // Add notification to post author
    if (post.authorId) {
      await pushNotification(post.authorId, {
        type: 'moderation',
        message: 'Your post was removed by admin.',
        meta: { postId, adminId }
      });
    }

    return post;
  } catch (error) {
    throw new Error(`Failed to delete post: ${error.message}`);
  }
};

/* Restore a post */
const restorePost = async (postId, adminId) => {
  try {
    const post = await ThreadComment.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    post.status = 'active';
    await post.save();

    return post;
  } catch (error) {
    throw new Error(`Failed to restore post: ${error.message}`);
  }
};

/* Helper function to push notification to user */
const pushNotification = async (userId, notification) => {
  try {
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          notifications: {
            type: notification.type,
            message: notification.message,
            meta: notification.meta || {}
          }
        }
      }
    );
  } catch (error) {
    console.error('Failed to push notification:', error);
  }
};

module.exports = {
  getDashboardStats,
  getUsersWithFilters,
  banUser,
  unbanUser,
  deactivateUser,
  activateUser,
  setUserFlag,
  listCertificates,
  approveCertificate,
  rejectCertificate,
  approveThread: async (threadId) => {
    const thread = await Thread.findById(threadId);
    if (!thread) throw new Error('Thread not found');
    thread.status = 'active';
    thread.rejectionReason = undefined;
    await thread.save();
    return thread;
  },
  rejectThread: async (threadId, reason) => {
    if (!reason || !reason.trim()) throw new Error('Rejection reason required');
    const thread = await Thread.findById(threadId);
    if (!thread) throw new Error('Thread not found');
    thread.status = 'rejected';
    thread.rejectionReason = reason.trim();
    await thread.save();
    return thread;
  },
  softDeleteThread,
  restoreThread,
  softDeletePost,
  restorePost,
  pushNotification
};


