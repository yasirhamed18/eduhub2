/**
 * Validate a quiz questions array.
 * Returns { ok: true, questions } or { ok: false, error }.
 */
function validateQuizQuestions(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'Quiz needs at least one question.' };
  }
  if (raw.length > 100) {
    return { ok: false, error: 'A quiz cannot have more than 100 questions.' };
  }

  const questions = [];
  for (let i = 0; i < raw.length; i++) {
    const q = raw[i];
    if (!q || typeof q !== 'object') {
      return { ok: false, error: `Question ${i + 1} is invalid.` };
    }
    const questionText = String(q.q || '').trim();
    if (!questionText) {
      return { ok: false, error: `Question ${i + 1} is missing its text.` };
    }
    if (questionText.length > 2000) {
      return { ok: false, error: `Question ${i + 1} text is too long.` };
    }

    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      return { ok: false, error: `Question ${i + 1} must have between 2 and 6 options.` };
    }
    const options = q.options.map((o) => String(o || '').trim().slice(0, 500));
    for (const opt of options) {
      if (!opt) {
        return { ok: false, error: `Question ${i + 1} has an empty option.` };
      }
    }
    if (options.length !== new Set(options).size) {
      return { ok: false, error: `Question ${i + 1} has duplicate options.` };
    }

    const correct = Number(q.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) {
      return { ok: false, error: `Question ${i + 1} has an invalid correct answer.` };
    }

    questions.push({ q: questionText, options, correct });
  }

  return { ok: true, questions };
}

module.exports = { validateQuizQuestions };
