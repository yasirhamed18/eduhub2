const pool = require('../db');

function mapCategory(row) {
  return {
    id: row.id,
    key: row.key_name,
    label: row.label,
    icon: row.icon,
    color: row.hex_color,
  };
}

// GET /api/categories  (+ resource counts per category)
async function listCategories(req, res) {
  const [rows] = await pool.query(`
    SELECT c.id, c.key_name, c.label, c.icon, c.hex_color, c.sort_order,
           COUNT(r.id) AS resource_count
    FROM categories c
    LEFT JOIN resources r ON r.category_id = c.id
    GROUP BY c.id, c.key_name, c.label, c.icon, c.hex_color, c.sort_order
    ORDER BY c.sort_order ASC
  `);

  return res.json({
    categories: rows.map((r) => ({
      ...mapCategory(r),
      resource_count: Number(r.resource_count) || 0,
    })),
  });
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// POST /api/admin/categories
async function createCategory(req, res) {
  const { label, icon, color } = req.body || {};
  if (!label || !String(label).trim()) {
    return res.status(400).json({ error: 'Label is required.' });
  }
  const cleanLabel = String(label).trim().slice(0, 100);
  const key = slugify(cleanLabel) || 'category';

  const [rows] = await pool.query('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM categories');
  const sortOrder = Number(rows[0] ? rows[0].max_order : 0) + 1;

  const [result] = await pool.query(
    'INSERT INTO categories (key_name, label, icon, hex_color, sort_order) VALUES (?, ?, ?, ?, ?)',
    [
      key,
      cleanLabel,
      icon ? String(icon).trim().slice(0, 16) : '📁',
      color ? String(color).trim().slice(0, 9) : '#2563eb',
      sortOrder,
    ]
  );

  const [row] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
  return res.status(201).json({ category: mapCategory(row[0]) });
}

// PATCH /api/admin/categories/:id
async function updateCategory(req, res) {
  const id = Number(req.params.id);
  const { label, icon, color } = req.body || {};

  const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  const updates = [];
  const params = [];
  if (label !== undefined) {
    if (!String(label).trim()) return res.status(400).json({ error: 'Label cannot be empty.' });
    updates.push('label = ?');
    params.push(String(label).trim().slice(0, 100));
  }
  if (icon !== undefined) {
    updates.push('icon = ?');
    params.push(String(icon).trim().slice(0, 16) || '📁');
  }
  if (color !== undefined) {
    updates.push('hex_color = ?');
    params.push(String(color).trim().slice(0, 9) || '#2563eb');
  }
  if (!updates.length) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  params.push(id);
  await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

  const [row] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  return res.json({ category: mapCategory(row[0]) });
}

// DELETE /api/admin/categories/:id
async function deleteCategory(req, res) {
  const id = Number(req.params.id);
  const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ error: 'Category not found.' });
  }
  const [count] = await pool.query('SELECT COUNT(*) AS c FROM resources WHERE category_id = ?', [id]);
  if (Number(count[0].c) > 0) {
    return res
      .status(409)
      .json({ error: 'This category still has resources. Move or delete them first.' });
  }
  await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  return res.json({ success: true });
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
