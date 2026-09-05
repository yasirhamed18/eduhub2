'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, RotateCcw, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Loader, EmptyState } from '@/components/ui/Feedback';
import type { Resource } from '@/types';

export default function QuizPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ resource: Resource }>(`/resources/${id}`);
      setResource(res.resource);
    } catch {
      setResource(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader label="Loading quiz…" />;
  if (!resource || resource.category?.key !== 'quizzes' || !resource.questions?.length) {
    return (
      <div className="container">
        <EmptyState icon="🎯" title="Quiz not found" subtitle="This quiz may have been removed." />
      </div>
    );
  }

  const questions = resource.questions;
  const total = questions.length;

  const selectAnswer = (i: number) => {
    if (answered) return;
    setAnswered(true);
    setSelected(i);
    if (i === questions[idx].correct) {
      setScore((s) => s + 1);
    }
  };

  const next = () => {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setAnswered(false);
      setSelected(null);
    } else {
      setDone(true);
    }
  };

  const retry = () => {
    setIdx(0);
    setScore(0);
    setAnswered(false);
    setSelected(null);
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / total) * 100);
    const message =
      pct >= 80 ? 'Excellent work! 🎉' : pct >= 50 ? 'Good effort — keep practicing! 💪' : 'Nice try! A bit more practice will help. 📚';
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="quiz-wrap">
          <div className="quiz-card quiz-result">
            <div className="quiz-progress">
              <div className="quiz-progress-bar" style={{ width: '100%' }} />
            </div>
            <div className="score">{score}/{total}</div>
            <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{message}</p>
            <p className="hint" style={{ marginBottom: 24 }}>
              You scored {pct}% on “{resource.title}”
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={retry}>
                <RotateCcw size={16} /> Try again
              </button>
              <Link href={`/category/${resource.category?.key || 'quizzes'}`} className="btn btn-ghost">
                📚 More quizzes
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <Link href={`/category/${resource.category?.key || 'quizzes'}`} className="back-link">
        <ArrowLeft size={16} /> Back to {resource.category?.label || 'Quizzes'}
      </Link>

      <div className="quiz-wrap">
        <div className="quiz-card">
          <div className="quiz-progress">
            <div className="quiz-progress-bar" style={{ width: `${(idx / total) * 100}%` }} />
          </div>
          <p className="hint">
            Question {idx + 1} of {total}
          </p>
          <p className="quiz-q">{q.q}</p>
          <div>
            {q.options.map((opt, i) => {
              let cls = 'quiz-opt';
              if (answered) {
                if (i === q.correct) cls += ' correct';
                else if (i === selected) cls += ' wrong';
              }
              return (
                <button key={i} className={cls} onClick={() => selectAnswer(i)} disabled={answered}>
                  {opt}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className="mt-2" style={{ textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={next}>
                <CheckCircle size={16} /> {idx + 1 < total ? 'Next question' : 'See results'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}