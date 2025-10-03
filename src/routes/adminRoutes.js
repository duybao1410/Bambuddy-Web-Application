const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

router.use(verifyAdmin);

router.get('/dashboard', adminController.renderDashboard);
router.get('/settings', adminController.renderSettings);
// Content moderation
router.get('/content/pending', adminController.listPendingContent);
router.post('/content/:type/:id/approve', adminController.approveContent);
router.post('/content/:type/:id/revoke', adminController.revokeContent);

router.get('/users', adminController.getUsers);
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);
// Deactivate/activate endpoints removed per policy: admins cannot be deactivated, only banned by another admin
router.post('/users/:id/flag', adminController.setUserFlag);

// Bulk user management
router.post('/users/bulk-ban', adminController.bulkBanUsers);
router.post('/users/bulk-unban', adminController.bulkUnbanUsers);
router.post('/users/bulk-flag', adminController.bulkFlagUsers);
router.post('/users/bulk-unflag', adminController.bulkUnflagUsers);
router.post('/users/bulk-role', adminController.bulkChangeRole);

router.get('/certificates', adminController.getCertificates);
router.post('/certificates/:userId/approve', adminController.approveCertificate);
router.post('/certificates/:userId/reject', adminController.rejectCertificate);

// Thread moderation
router.post('/threads/:id/approve', adminController.approveThread);
router.post('/threads/:id/reject', adminController.rejectThread);

router.post('/content/threads/:id/soft-delete', adminController.softDeleteThread);
router.post('/content/threads/:id/restore', adminController.restoreThread);
router.post('/content/posts/:id/soft-delete', adminController.softDeletePost);
router.post('/content/posts/:id/restore', adminController.restorePost);

module.exports = router;


