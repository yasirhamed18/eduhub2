-- ============================================================
-- EduHub Seed Data
-- Categories are seeded here.
-- The admin user is created by scripts/seed.js so that the
-- admin password comes from environment variables and is hashed
-- at runtime (never hardcoded in any file).
-- ============================================================

USE eduhub;

INSERT IGNORE INTO categories (key_name, label, icon, hex_color, sort_order) VALUES
('notes',      'Notes',      '📝', '#B8842A', 1),
('pdfs',       'PDFs',       '📄', '#A6453B', 2),
('images',     'Images',     '🖼️', '#2E6F5E', 3),
('books',      'Books',      '📚', '#43507B', 4),
('slides',     'Slides',     '🖥️', '#8C4F82', 5),
('quizzes',    'Quizzes',    '🎯', '#3B7A54', 6),
('examprep',   'Exam Prep',  '🧠', '#7A5B3A', 7),
('pastpapers', 'Past Papers','📋', '#2C6E8E', 8);
