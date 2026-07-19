import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { InvestorQuestion } from '@shared/types.js';
import { formatTimestamp } from '../lib/format.js';

interface Props {
  questions: InvestorQuestion[];
  onSeek: (seconds: number) => void;
}

export default function InvestorQuestions({ questions, onSeek }: Props) {
  const [openId, setOpenId] = useState<string | null>(questions[0]?.id ?? null);

  if (questions.length === 0) return null;

  return (
    <section aria-labelledby="questions-heading">
      <h2
        id="questions-heading"
        className="font-display text-sm tracking-wide text-ink-soft uppercase"
      >
        Questions to prepare for
      </h2>
      <p className="mt-1 mb-4 text-sm text-ink-muted">
        Each question is tied to a specific weakness in the pitch, not drawn from a generic list.
      </p>

      <div className="divide-y divide-line border border-line bg-paper-raised">
        {questions.map((q, index) => {
          const open = openId === q.id;
          return (
            <div key={q.id}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : q.id)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-paper sm:p-5"
                >
                  <span className="mt-0.5 font-display text-sm text-ink-muted tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 font-medium">{q.question}</span>
                  <ChevronDown
                    size={16}
                    className={`mt-1 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </h3>

              {open && (
                <div className="space-y-4 px-4 pb-5 pl-11 sm:px-5 sm:pl-13">
                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                      Why they will ask
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {q.reason}
                      {q.triggerTimestampSeconds !== null && (
                        <>
                          {' '}
                          <button
                            type="button"
                            onClick={() => onSeek(q.triggerTimestampSeconds as number)}
                            className="rounded-sm border border-line px-1.5 py-0.5 text-xs tabular-nums transition-colors hover:border-ink hover:text-ink"
                          >
                            {formatTimestamp(q.triggerTimestampSeconds)}
                          </button>
                        </>
                      )}
                    </p>
                  </div>

                  {q.answerFramework.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                        How to structure the answer
                      </h4>
                      <ol className="mt-1.5 space-y-1.5">
                        {q.answerFramework.map((step, i) => (
                          <li key={step} className="flex gap-2.5 text-sm text-ink-soft">
                            <span className="text-ink-muted tabular-nums">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
