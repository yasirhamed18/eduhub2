const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getStats, listUsers, updateUserRole, deleteUser, listAllComments } = require('../controllers/adminController');
const { createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');

const router = express.Router();

// All admin routes require authentication AND admin role
router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:id', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/comments', listAllComments);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

module.exports = router;
