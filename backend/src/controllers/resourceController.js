const pool = require('../db');
const path = require('path');
const { validateQuizQuestions } = require('../utils/validation');
require('dotenv').config();

function mapResource(row, req) {
  const filePath = row.file_path;
  let fileUrl = null;
  if (row.type === 'file' && filePath) {
    const base = process.env.UPLOAD_BASE_URL || `${req.protocol}://${req.get('host')}/uploads`;
    fileUrl = `${base}/${encodeURIComponent(path.basename(filePath))}`;
  }
  return {
    id: row.id,
    category_id: row.category_id,
    category: row.category_key ? {
      key: row.category_key,
      label: row.category_label,
      icon: row.category_icon,
      color: row.category_hex,
    } : null,
    title: row.title,
    description: row.description,
    type: row.type,
    file_name: row.file_name,
    file_size: row.file_size,
    file_url: fileUrl,
    url: row.url || null,
    questions: row.questions ? (typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions) : null,
    has_questions: row.has_questions ? !!Number(row.has_questions) : false,
    question_count: row.question_count ? Number(row.question_count) : 0,
    view_count: Number(row.view_count) || 0,
    download_count: Number(row.download_count) || 0,
    like_count: Number(row.like_count) || 0,
    comment_count: Number(row.comment_count) || 0,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };
}

const SELECT_GROUP = `
  SELECT
    r.*,
    c.key_name AS category_key,
    c.label AS category_label,
    c.icon AS category_icon,
    c.hex_color AS category_hex,
    r.questions IS NOT NULL AND JSON_LENGTH(r.questions) > 0 AS has_questions,
    CASE WHEN r.questions IS NULL THEN 0 ELSE JSON_LENGTH(r.questions) END AS question_count,
    (SELECT COUNT(*) FROM likes l WHERE l.resource_id = r.id) AS like_count,
    (SELECT COUNT(*) FROM comments cm WHERE cm.resource_id = r.id) AS comment_count
  FROM resources r
  JOIN categories c ON c.id = r.category_id
`;

// GET /api/resources
async function listResources(req, res) {
  const { category, q } = req.query;
  const params = [];
  const where = [];

  if (category) {
    where.push('c.key_name = ?');
    params.push(category);
  }
  if (q && String(q).trim()) {
    where.push('(r.title LIKE ? OR r.description LIKE ?)');
    const like = `%${String(q).trim()}%`;
    params.push(like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `${SELECT_GROUP} ${whereSql} ORDER BY r.created_at DESC`,
    params
  );
  return res.json({ resources: rows.map((r) => mapResource(r, req)) });
}

// GET /api/resources/:id
async function getResource(req, res) {
  const id = Number(req.params.id);
  const [rows] = await pool.query(`${SELECT_GROUP} WHERE r.id = ?`, [id]);
  if (!rows.length) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  let likedByMe = false;
  if (req.user) {
    const [likes] = await pool.query('SELECT 1 FROM likes WHERE resource_id = ? AND user_id = ?', [id, req.user.id]);
    likedByMe = likes.length > 0;
  }

  const resource = mapResource(rows[0], req);
  return res.json({ resource: { ...resource, liked_by_me: likedByMe } });
}

// POST /api/resources  (link item) -- admin
async function createLinkResource(req, res) {
  const { category_id, title, description, url } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (!category_id) {
    return res.status(400).json({ error: 'Category is required.' });
  }
  if (!url || !/^https?:\/\//i.test(String(url.trim()))) {
    return res.status(400).json({ error: 'Please provide a valid http(s) link.' });
  }

  const [cat] = await pool.query('SELECT id FROM categories WHERE id = ?', [Number(category_id)]);
  if (!cat.length) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  const cleanTitle = String(title).trim().slice(0, 255);
  const cleanDesc = description ? String(description).trim().slice(0, 5000) : null;
  const cleanUrl = String(url).trim().slice(0, 1000);

  const [result] = await pool.query(
    `INSERT INTO resources (category_id, title, description, type, url, uploaded_by)
     VALUES (?, ?, ?, 'link', ?, ?)`,
    [cat[0].id, cleanTitle, cleanDesc, cleanUrl, req.user.id]
  );

  const [inserted] = await pool.query(`${SELECT_GROUP} WHERE r.id = ?`, [result.insertId]);
  res.status(201).json({ resource: mapResource(inserted[0], req) });
}

// POST /api/resources/upload  (file item) -- admin
async function createFileResource(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  const category_id = Number(req.body.category_id);
  let title = req.body.title ? String(req.body.title).trim() : '';
  const description = req.body.description ? String(req.body.description).trim() : '';

  if (!category_id) {
    return res.status(400).json({ error: 'Category is required.' });
  }
  const [cat] = await pool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
  if (!cat.length) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  if (!title) {
    title = req.file.originalname.replace(/\.[^/.]+$/, '');
  }
  if (title.length > 255) title = title.slice(0, 255);

  const [result] = await pool.query(
    `INSERT INTO resources
       (category_id, title, description, type, file_name, file_size, file_path, uploaded_by)
     VALUES (?, ?, ?, 'file', ?, ?, ?, ?)`,
    [category_id, title, description || null, req.file.originalname, req.file.size, req.file.filename, req.user.id]
  );

  const [inserted] = await pool.query(`${SELECT_GROUP} WHERE r.id = ?`, [result.insertId]);
  const resource = mapResource(inserted[0], req);
  res.status(201).json({ resource });
}

// POST /api/resources/quiz -- admin
async function createQuizResource(req, res) {
  const { category_id, title, description, questions } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Quiz title is required.' });
  }

  const [cat] = await pool.query(
    'SELECT id FROM categories WHERE key_name = ? OR id = ?',
    ['quizzes', Number(category_id) || 0]
  );
  if (!cat.length) {
    return res.status(400).json({ error: 'Quizzes category not found.' });
  }

  const validated = validateQuizQuestions(questions);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  const cleanTitle = String(title).trim().slice(0, 255);
  const cleanDesc = description ? String(description).trim().slice(0, 5000) : null;

  const [result] = await pool.query(
    `INSERT INTO resources (category_id, title, description, type, questions, uploaded_by)
     VALUES (?, ?, ?, 'link', ?, ?)`,
    [cat[0].id, cleanTitle, cleanDesc, JSON.stringify(validated.questions), req.user.id]
  );

  const [inserted] = await pool.query(`${SELECT_GROUP} WHERE r.id = ?`, [result.insertId]);
  res.status(201).json({ resource: mapResource(inserted[0], req) });
}

// PUT /api/resources/:id -- admin
async function updateResource(req, res) {
  const id = Number(req.params.id);
  const { title, description, category_id } = req.body || {};

  const [existing] = await pool.query('SELECT * FROM resources WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  const updates = [];
  const params = [];

  if (title !== undefined) {
    if (!String(title).trim()) return res.status(400).json({ error: 'Title cannot be empty.' });
    updates.push('title = ?');
    params.push(String(title).trim().slice(0, 255));
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description ? String(description).trim().slice(0, 5000) : null);
  }
  if (category_id !== undefined) {
    const [cat] = await pool.query('SELECT id FROM categories WHERE id = ?', [Number(category_id)]);
    if (!cat.length) return res.status(400).json({ error: 'Invalid category.' });
    updates.push('category_id = ?');
    params.push(Number(category_id));
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  params.push(id);
  await pool.query(`UPDATE resources SET ${updates.join(', ')} WHERE id = ?`, params);

  const [updated] = await pool.query(`${SELECT_GROUP} WHERE r.id = ?`, [id]);
  res.json({ resource: mapResource(updated[0], req) });
}

// DELETE /api/resources/:id -- admin
async function deleteResource(req, res) {
  const id = Number(req.params.id);

  const [existing] = await pool.query('SELECT file_path FROM resources WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  await pool.query('DELETE FROM resources WHERE id = ?', [id]);

  // Remove stored file from disk (best effort)
  if (existing[0].file_path) {
    try {
      const fs = require('fs');
      const fullPath = require('path').join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', existing[0].file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (e) {
      // ignore disk errors
    }
  }

  res.json({ success: true });
}

// POST /api/resources/:id/view  -- increments view counter
async function incrementView(req, res) {
  const id = Number(req.params.id);
  const [result] = await pool.query(
    'UPDATE resources SET view_count = view_count + 1 WHERE id = ?',
    [id]
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Resource not found.' });
  }
  const [row] = await pool.query('SELECT view_count FROM resources WHERE id = ?', [id]);
  res.json({ view_count: Number(row[0].view_count) });
}

// POST /api/resources/:id/download -- increments download counter
async function incrementDownload(req, res) {
  const id = Number(req.params.id);
  const [result] = await pool.query(
    'UPDATE resources SET download_count = download_count + 1 WHERE id = ?',
    [id]
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Resource not found.' });
  }
  const [row] = await pool.query('SELECT download_count FROM resources WHERE id = ?', [id]);
  res.json({ download_count: Number(row[0].download_count) });
}

// GET /api/resources/:id/download  -- streams the file to the user + increments count
async function downloadResource(req, res) {
  const id = Number(req.params.id);
  const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [id]);
  if (!rows.length) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  const r = rows[0];
  await pool.query('UPDATE resources SET download_count = download_count + 1 WHERE id = ?', [id]);

  if (r.type === 'link') {
    return res.json({ redirect: r.url });
  }

  if (!r.file_path) {
    return res.status(404).json({ error: 'File missing for this resource.' });
  }

  const fs = require('fs');
  const path = require('path');
  const fullPath = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads', r.file_path);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'File missing on disk.' });
  }

  res.download(fullPath, r.file_name || 'download');
}

// POST /api/resources/:id/like -- toggle like (auth required)
async function toggleLike(req, res) {
  const id = Number(req.params.id);
  const userId = req.user.id;

  const [existing] = await pool.query('SELECT id FROM resources WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  const [like] = await pool.query(
    'SELECT id FROM likes WHERE resource_id = ? AND user_id = ?',
    [id, userId]
  );

  if (like.length) {
    await pool.query('DELETE FROM likes WHERE id = ?', [like[0].id]);
  } else {
    await pool.query('INSERT INTO likes (resource_id, user_id) VALUES (?, ?)', [id, userId]);
  }

  const [[countRow]] = await pool.query('SELECT COUNT(*) AS c FROM likes WHERE resource_id = ?', [id]);
  const [stillLiked] = await pool.query(
    'SELECT 1 FROM likes WHERE resource_id = ? AND user_id = ?',
    [id, userId]
  );

  res.json({ liked: stillLiked.length > 0, like_count: Number(countRow.c) });
}

// GET /api/resources/:id/comments
async function listComments(req, res) {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT c.id, c.user_id, u.name AS user_name, c.body, c.created_at
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.resource_id = ?
     ORDER BY c.created_at ASC`,
    [id]
  );
  res.json({ comments: rows });
}

// POST /api/resources/:id/comments -- auth required
async function createComment(req, res) {
  const id = Number(req.params.id);
  const { body } = req.body || {};

  const cleanBody = body ? String(body).trim() : '';
  if (!cleanBody) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }
  if (cleanBody.length > 1000) {
    return res.status(400).json({ error: 'Comment is too long (max 1000 characters).' });
  }

  const [existing] = await pool.query('SELECT id FROM resources WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  const [result] = await pool.query(
    'INSERT INTO comments (resource_id, user_id, body) VALUES (?, ?, ?)',
    [id, req.user.id, cleanBody]
  );

  res.status(201).json({
    comment: {
      id: result.insertId,
      user_id: req.user.id,
      user_name: req.user.name,
      body: cleanBody,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    },
  });
}

// DELETE /api/comments/:commentId -- admin or comment author
async function deleteComment(req, res) {
  const commentId = Number(req.params.commentId);
  const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
  if (!rows.length) {
    return res.status(404).json({ error: 'Comment not found.' });
  }
  const comment = rows[0];

  const isAdmin = req.user.role === 'admin';
  const isOwner = Number(comment.user_id) === Number(req.user.id);
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'You can only delete your own comments.' });
  }

  await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);
  res.json({ success: true });
}

module.exports = {
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
};
