import { VIRAL_MOMENT_LABELS } from '@shared/constants.js';
import type { ViralMoment } from '@shared/types.js';
import { formatTimestamp, viralMomentTone } from '../lib/format.js';

interface Props {
  moments: ViralMoment[];
  durationSeconds: number;
  selectedId: string | null;
  onSelect: (moment: ViralMoment) => void;
}

export default function ViralMomentTimeline({
  moments,
  durationSeconds,
  selectedId,
  onSelect,
}: Props) {
  // A zero or missing duration would make every marker land at the same place.
  const safeDuration = durationSeconds > 0 ? durationSeconds : 1;

  const position = (seconds: number): number => {
    const clamped = Math.min(Math.max(seconds, 0), safeDuration);
    // Inset the usable rail so markers at 0s and at the end stay fully visible.
    return 2 + (clamped / safeDuration) * 96;
  };

  if (moments.length === 0) {
    return (
      <p className="border border-line bg-paper-raised p-4 text-sm text-ink-muted">
        No distinct moments were identified in this video.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-sm tracking-wide text-ink-soft uppercase">
          Attention timeline
        </h2>
        <span className="text-xs text-ink-muted">{moments.length} moments</span>
      </div>

      <div className="relative pt-1 pb-7">
        <div className="relative h-1.5 w-full rounded-full bg-line" role="presentation">
          {moments.map((moment) => {
            const tone = viralMomentTone(moment.type, moment.severity);
            const selected = moment.id === selectedId;
            return (
              <button
                key={moment.id}
                type="button"
                onClick={() => onSelect(moment)}
                aria-label={`${formatTimestamp(moment.timestampSeconds)}, ${VIRAL_MOMENT_LABELS[moment.type]}. Jump to this moment.`}
                aria-current={selected ? 'true' : undefined}
                title={`${formatTimestamp(moment.timestampSeconds)} — ${VIRAL_MOMENT_LABELS[moment.type]}`}
                className="absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={{ left: `${position(moment.timestampSeconds)}%` }}
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
        {moments.map((moment) => {
          const tone = viralMomentTone(moment.type, moment.severity);
          const selected = moment.id === selectedId;
          return (
            <li key={moment.id}>
              <button
                type="button"
                onClick={() => onSelect(moment)}
                className={[
                  'flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-xs transition-colors',
                  selected
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line bg-paper-raised hover:border-line-strong',
                ].join(' ')}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
                <span className="font-medium tabular-nums">
                  {formatTimestamp(moment.timestampSeconds)}
                </span>
                <span className={selected ? 'text-paper/75' : 'text-ink-muted'}>
                  {VIRAL_MOMENT_LABELS[moment.type]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
