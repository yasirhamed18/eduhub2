const pool = require('../db');

// GET /api/admin/stats
async function getStats(req, res) {
  const [[resources]] = await pool.query('SELECT COUNT(*) AS c FROM resources');
  const [[categories]] = await pool.query('SELECT COUNT(*) AS c FROM categories');
  const [[users]] = await pool.query('SELECT COUNT(*) AS c FROM users');
  const [[likes]] = await pool.query('SELECT COUNT(*) AS c FROM likes');
  const [[comments]] = await pool.query('SELECT COUNT(*) AS c FROM comments');
  const [[views]] = await pool.query('SELECT COALESCE(SUM(view_count),0) AS c FROM resources');
  const [[downloads]] = await pool.query('SELECT COALESCE(SUM(download_count),0) AS c FROM resources');

  res.json({
    stats: {
      resources: Number(resources.c),
      categories: Number(categories.c),
      users: Number(users.c),
      likes: Number(likes.c),
      comments: Number(comments.c),
      views: Number(views.c),
      downloads: Number(downloads.c),
    },
  });
}

// GET /api/admin/users  -- list all users
async function listUsers(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM resources r WHERE r.uploaded_by = u.id) AS resource_count
     FROM users u ORDER BY u.created_at DESC`
  );
  res.json({ users: rows });
}

// PATCH /api/admin/users/:id  -- update role (promote/demote between admin and user)
async function updateUserRole(req, res) {
  const id = Number(req.params.id);
  const { role } = req.body || {};

  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ error: 'Role must be "admin" or "user".' });
  }
  if (Number(id) === Number(req.user.id)) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'User not found.' });
  }

  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  res.json({ success: true, id, role });
}

// DELETE /api/admin/users/:id  -- delete a user
async function deleteUser(req, res) {
  const id = Number(req.params.id);
  if (Number(id) === Number(req.user.id)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'User not found.' });
  }
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  res.json({ success: true });
}

// GET /api/admin/comments  -- list all comments for moderation
async function listAllComments(req, res) {
  const [rows] = await pool.query(
    `SELECT c.id, c.resource_id, c.user_id, c.body, c.created_at,
            u.name AS user_name,
            r.title AS resource_title
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN resources r ON r.id = c.resource_id
     ORDER BY c.created_at DESC`
  );
  res.json({ comments: rows });
}

module.exports = {
  getStats,
  listUsers,
  updateUserRole,
  deleteUser,
  listAllComments,
};
