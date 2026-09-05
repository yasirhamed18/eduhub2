const express = require('express');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  listResources,
  getResource,
  createLinkResource,
  createFileResource,
  createQuizResource,
  updateResource,
  deleteResource,
  incrementView,
  incrementDownload,
  downloadResource,
  toggleLike,
  listComments,
  createComment,
  deleteComment,
} = require('../controllers/resourceController');

const router = express.Router();

// Comment deletion must be registered before the generic '/:id' routes
// so that '/comments/:commentId' is not swallowed by ':id'.
router.delete('/comments/:commentId', requireAuth, deleteComment);

// Public reads
router.get('/', listResources);
router.get('/:id', optionalAuth, getResource);

// View / download counters
router.post('/:id/view', incrementView);
router.post('/:id/download', incrementDownload);
router.get('/:id/download', downloadResource);

// Likes: to like you must be authenticated (need a user identity)
router.post('/:id/like', requireAuth, toggleLike);

// Comments
router.get('/:id/comments', listComments);
router.post('/:id/comments', requireAuth, createComment);

// Admin-only writes
router.post('/', requireAuth, requireAdmin, createLinkResource);
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), createFileResource);
router.post('/quiz', requireAuth, requireAdmin, createQuizResource);
router.put('/:id', requireAuth, requireAdmin, updateResource);
router.delete('/:id', requireAuth, requireAdmin, deleteResource);

module.exports = router;
