const adminService = require('../services/adminService');
const { Thread } = require('../models/threadSchema');
const { ThreadComment } = require('../models/postSchema');

/* Removed overview JSON endpoint; dashboard renders server-side */

/* Get users with filtering and pagination */
const getUsers = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      role: req.query.role,
      active: req.query.active,
      locked: req.query.locked,
      search: req.query.search,
      reportedMin: req.query.reportedMin
    };

    const result = await adminService.getUsersWithFilters(filters);
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* Ban a user */
const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id.toString();
    
    const user = await adminService.banUser(id, adminId);
    
    res.json({
      success: true,
      message: 'User banned successfully',
      data: { userId: user._id, isLocked: user.isLocked }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Unban a user */
const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id.toString();
    
    const user = await adminService.unbanUser(id, adminId);
    
    res.json({
      success: true,
      message: 'User unbanned successfully',
      data: { userId: user._id, isLocked: user.isLocked }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Deactivate a user */
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id.toString();
    
    const user = await adminService.deactivateUser(id, adminId);
    
    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: { userId: user._id, isActive: user.isActive }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Activate a user */
const activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id.toString();
    
    const user = await adminService.activateUser(id, adminId);
    
    res.json({
      success: true,
      message: 'User activated successfully',
      data: { userId: user._id, isActive: user.isActive }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Set or unset a moderation flag on a user */
const setUserFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { flag } = req.body;
    const adminId = req.user._id.toString();

    const user = await adminService.setUserFlag(id, flag, adminId);

    res.json({
      success: true,
      message: 'User flag updated successfully',
      data: { userId: user._id, isFlagged: user.isFlagged }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* List certificates with filtering */
const getCertificates = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      guideId: req.query.guideId,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await adminService.listCertificates(filters);
    
    res.json({
      success: true,
      message: 'Certificates retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* Approve a certificate */
const approveCertificate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { certificationId } = req.body;
    const adminId = req.user._id.toString();
    
    if (!certificationId) {
      return res.status(400).json({
        success: false,
        message: 'Certification ID is required'
      });
    }
    
    const certification = await adminService.approveCertificate(userId, certificationId, adminId);
    
    res.json({
      success: true,
      message: 'Certificate approved successfully',
      data: { certificationId, isVerified: certification.isVerified }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Reject a certificate */
const rejectCertificate = async (req, res) => {
  try {
    const { userId } = req.params;
    const { certificationId, reason } = req.body;
    const adminId = req.user._id.toString();
    
    if (!certificationId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Certification ID and reason are required'
      });
    }
    
    const certification = await adminService.rejectCertificate(userId, certificationId, reason, adminId);
    
    res.json({
      success: true,
      message: 'Certificate rejected successfully',
      data: { certificationId, rejection: certification.rejection }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Soft delete a thread */
const softDeleteThread = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id.toString();
    
    const thread = await adminService.softDeleteThread(id, adminId);
    
    res.json({
      success: true,
      message: 'Thread deleted successfully',
      data: { threadId: thread._id, status: thread.status }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Restore a thread */
const restoreThread = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id.toString();
    
    const thread = await adminService.restoreThread(id, adminId);
    
    res.json({
      success: true,
      message: 'Thread restored successfully',
      data: { threadId: thread._id, status: thread.status }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Soft delete a post */
const softDeletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id.toString();
    
    const post = await adminService.softDeletePost(id, adminId);
    
    res.json({
      success: true,
      message: 'Post deleted successfully',
      data: { postId: post._id, status: post.status }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Restore a post */
const restorePost = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id.toString();
    
    const post = await adminService.restorePost(id, adminId);
    
    res.json({
      success: true,
      message: 'Post restored successfully',
      data: { postId: post._id, status: post.status }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* Render admin dashboard page */
const renderDashboard = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.render('dashboard/admin/dashboard', { 
      user: req.user,
      stats: stats,
      title: 'Admin Dashboard'
    });
  } catch (error) {
    res.status(500).render('dashboard/admin/dashboard', { 
      user: req.user,
      error: error.message,
      title: 'Admin Dashboard'
    });
  }
};

/* Render admin settings page */
const renderSettings = async (req, res) => {
  try {
    // reuse userService.getSettings shape if needed later; for now pass req.user
    res.render('dashboard/admin/settings', { user: req.user, settings: { accountType: 'admin', phone: req.user?.profileInfo?.phone || '', theme: req.user?.theme || 'light' } });
  } catch (error) {
    res.status(500).render('dashboard/admin/settings', { user: req.user, error: error.message });
  }
};

module.exports = {
  renderDashboard,
  async approveThread(req, res) {
    try {
      const { id } = req.params;
      const thread = await adminService.approveThread(id);
      res.json({ success: true, data: { threadId: thread._id, status: thread.status } });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },
  async rejectThread(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const thread = await adminService.rejectThread(id, reason);
      res.json({ success: true, data: { threadId: thread._id, status: thread.status, rejectionReason: thread.rejectionReason } });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },
  async listPendingContent(req, res) {
    try {
      let [threads, comments] = await Promise.all([
        Thread.find({ status: 'pending' })
          .populate('authorId', 'profileInfo email')
          .sort({ createdAt: -1 })
          .lean(),
        ThreadComment.find({ status: 'pending' })
          .populate('authorId', 'profileInfo email')
          .sort({ createdAt: -1 })
          .lean()
      ]);
      // Compute safe authorName on server for robustness
      threads = threads.map(t => ({
        ...t,
        authorName: (t.authorId && (t.authorId.profileInfo || t.authorId.email))
          ? (`${t.authorId.profileInfo?.firstName || ''} ${t.authorId.profileInfo?.lastName || ''}`.trim() || t.authorId.email || 'Unknown')
          : 'Unknown'
      }));
      comments = comments.map(c => ({
        ...c,
        authorName: (c.authorId && (c.authorId.profileInfo || c.authorId.email))
          ? (`${c.authorId.profileInfo?.firstName || ''} ${c.authorId.profileInfo?.lastName || ''}`.trim() || c.authorId.email || 'Unknown')
          : 'Unknown'
      }));
      res.json({ success: true, data: { threads, comments } });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async approveContent(req, res) {
    try {
      const { type, id } = req.params; // type: 'thread' | 'comment'
      if (type === 'thread') {
        await Thread.findByIdAndUpdate(id, { status: 'active', updatedAt: new Date() });
      } else {
        const updated = await ThreadComment.findByIdAndUpdate(id, { status: 'active' }, { new: true });
        if (updated) {
          await Thread.findByIdAndUpdate(updated.threadId, { $inc: { commentCount: 1 }, lastActivity: new Date() });
        }
      }
      res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },
  async revokeContent(req, res) {
    try {
      const { type, id } = req.params;
      if (type === 'thread') {
        await Thread.findByIdAndUpdate(id, { status: 'hidden', updatedAt: new Date() });
      } else {
        await ThreadComment.findByIdAndUpdate(id, { status: 'hidden' });
      }
      res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
  },
  getUsers,
  banUser,
  unbanUser,
  setUserFlag,
  getCertificates,
  approveCertificate,
  rejectCertificate,
  softDeleteThread,
  restoreThread,
  softDeletePost,
  restorePost,
  renderSettings,
  // Bulk actions
  async bulkBanUsers(req, res) {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'userIds is required' });
      }
      const adminId = req.user._id.toString();
      // Skip admins
      const { User } = require('../models/userSchema');
      const result = await User.updateMany({ _id: { $in: userIds }, role: { $ne: 'admin' } }, { $set: { isLocked: true } });
      return res.json({ success: true, message: 'Bulk ban completed', updated: result.modifiedCount, skipped: userIds.length - result.modifiedCount });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async bulkUnbanUsers(req, res) {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'userIds is required' });
      }
      const { User } = require('../models/userSchema');
      const result = await User.updateMany({ _id: { $in: userIds }, role: { $ne: 'admin' } }, { $set: { isLocked: false } });
      return res.json({ success: true, message: 'Bulk unban completed', updated: result.modifiedCount, skipped: userIds.length - result.modifiedCount });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async bulkFlagUsers(req, res) {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'userIds is required' });
      }
      const { User } = require('../models/userSchema');
      const result = await User.updateMany({ _id: { $in: userIds }, role: { $ne: 'admin' } }, { $set: { isFlagged: true } });
      return res.json({ success: true, message: 'Bulk flag completed', updated: result.modifiedCount, skipped: userIds.length - result.modifiedCount });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async bulkUnflagUsers(req, res) {
    try {
      const { userIds } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'userIds is required' });
      }
      const { User } = require('../models/userSchema');
      const result = await User.updateMany({ _id: { $in: userIds }, role: { $ne: 'admin' } }, { $set: { isFlagged: false } });
      return res.json({ success: true, message: 'Bulk unflag completed', updated: result.modifiedCount, skipped: userIds.length - result.modifiedCount });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async bulkChangeRole(req, res) {
    try {
      const { userIds, role } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0 || !['tourguide','user'].includes(role)) {
        return res.status(400).json({ success: false, message: 'userIds and valid role are required' });
      }
      const { User } = require('../models/userSchema');
      const result = await User.updateMany({ _id: { $in: userIds }, role: { $ne: 'admin' } }, { $set: { role: role === 'tourguide' ? 'tourguide' : 'user' } });
      return res.json({ success: true, message: 'Bulk role change completed', updated: result.modifiedCount, skipped: userIds.length - result.modifiedCount });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }
};

