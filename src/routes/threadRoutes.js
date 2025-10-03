const express = require('express');
const router = express.Router();
const threadController = require('../controllers/threadController');
const authMiddleware = require('../middleware/authMiddleware');
const {uploadThreadPhotos, uploadPostPhotos} = require('../middleware/uploadMiddleware');

// Main page threads section - GET /threads
router.get('/', threadController.getMainPage);
router.get('/search', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.searchThreads);//localhost:3000/threads/search (method: GET)
router.get('/tags', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.getPopularTags);//localhost:3000/threads/tags (method: GET)
router.get('/my-posts', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.getUserThreads);//localhost:3000/threads/my-posts (method: GET)
router.post('/', authMiddleware.verifySession, authMiddleware.verifyActiveUser, uploadThreadPhotos, threadController.createThread);//localhost:3000/threads (method: POST)
router.get('/new', authMiddleware.verifySession, authMiddleware.verifyActiveUser, (req, res) => {
  res.render("forum/createThread");
});
router.get('/:threadId', threadController.getThreadDetail);//localhost:3000/threads/:threadId (method: GET)
router.delete('/:threadId', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.deleteThread);//localhost:3000/threads/:threadId (method: DELETE)
router.put('/:threadId', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.updateThread);//localhost:3000/threads/:threadId (method: PUT)
router.patch('/:threadId/hide', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.hideThread); //localhost:3000/threads/:threadId/hide (method: PATCH)
router.patch('/:threadId/unhide', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.unhideThread);
router.get('/:threadId/edit', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.getEditThreadPage);//localhost:3000/threads/:threadId/edit (method: GET)


// For comment - put more specific routes first
router.post('/comments/:commentId/react', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.toggleCommentReaction); // {"action":"like/dislike"}
router.delete("/comments/:commentId", authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.deleteComment);
router.post('/:threadId/comments', authMiddleware.verifySession, authMiddleware.verifyActiveUser, uploadPostPhotos, threadController.addComment);//{"content":"abc..."}
router.post('/:threadId/react', authMiddleware.verifySession, authMiddleware.verifyActiveUser, threadController.toggleThreadReaction); //{"action":"like/dislike"}

module.exports = router;