import { MOMENT_LABELS } from '@shared/constants.js';
import type { TimelineEvent } from '@shared/types.js';
import { formatTimestamp, momentTone } from '../lib/format.js';

interface Props {
  events: TimelineEvent[];
  durationSeconds: number;
  selectedId: string | null;
  onSelect: (event: TimelineEvent) => void;
}

export default function PitchTimeline({ events, durationSeconds, selectedId, onSelect }: Props) {
  // A zero or missing duration would make every marker land at the same place.
  const safeDuration = durationSeconds > 0 ? durationSeconds : 1;

  const position = (seconds: number): number => {
    const clamped = Math.min(Math.max(seconds, 0), safeDuration);
    // Inset the usable rail so markers at 0s and at the end stay fully visible.
    return 2 + (clamped / safeDuration) * 96;
  };

  if (events.length === 0) {
    return (
      <p className="border border-line bg-paper-raised p-4 text-sm text-ink-muted">
        No distinct moments were identified in this pitch.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-sm tracking-wide text-ink-soft uppercase">
          Pitch timeline
        </h2>
        <span className="text-xs text-ink-muted">{events.length} moments</span>
      </div>

      <div className="relative pt-1 pb-7">
        <div className="relative h-1.5 w-full rounded-full bg-line" role="presentation">
          {events.map((event) => {
            const tone = momentTone(event.type, event.severity);
            const selected = event.id === selectedId;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect(event)}
                aria-label={`${formatTimestamp(event.timestampSeconds)}, ${MOMENT_LABELS[event.type]}. Jump to this moment.`}
                aria-current={selected ? 'true' : undefined}
                title={`${formatTimestamp(event.timestampSeconds)} — ${MOMENT_LABELS[event.type]}`}
                className="absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={{ left: `${position(event.timestampSeconds)}%` }}
              >
                <span
                  className={[
                    'block rounded-full transition-all',
                    tone.dot,
                    selected
                      ? 'h-4.5 w-4.5 ring-2 ring-ink ring-offset-2 ring-offset-paper'
                      : 'h-3 w-3 hover:h-4 hover:w-4',
                  ].join(' ')}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex justify-between text-xs text-ink-muted">
          <span>00:00</span>
          <span>{formatTimestamp(durationSeconds)}</span>
        </div>
      </div>

      <ol className="flex flex-wrap gap-2">
        {events.map((event) => {
          const tone = momentTone(event.type, event.severity);
          const selected = event.id === selectedId;
          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelect(event)}
                className={[
                  'flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-xs transition-colors',
                  selected
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-paper-raised hover:border-line-strong',
                ].join(' ')}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                <span className="font-medium tabular-nums">
                  {formatTimestamp(event.timestampSeconds)}
                </span>
                <span className={selected ? 'text-paper/75' : 'text-ink-muted'}>
                  {MOMENT_LABELS[event.type]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
