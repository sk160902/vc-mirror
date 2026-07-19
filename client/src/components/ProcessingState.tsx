import { Check, Loader2 } from 'lucide-react';

export const PROCESSING_STAGES = [
  'Reading your pitch',
  'Understanding the company',
  'Mapping key moments',
  'Preparing investor questions',
  'Building your report',
] as const;

interface Props {
  /** Index of the stage currently in progress. Stages before it are complete. */
  activeStage: number;
}

export default function ProcessingState({ activeStage }: Props) {
  return (
    <div className="mx-auto max-w-md py-16" role="status" aria-live="polite">
      <h2 className="font-display text-2xl">Analyzing your pitch</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Gemini is watching the video and listening to the audio. This usually takes under a minute.
      </p>

      <ol className="mt-8 space-y-3">
        {PROCESSING_STAGES.map((stage, i) => {
          const done = i < activeStage;
          const active = i === activeStage;
          return (
            <li
              key={stage}
              className={[
                'flex items-center gap-3 text-sm transition-colors',
                done ? 'text-ink-muted' : active ? 'text-ink' : 'text-line-strong',
              ].join(' ')}
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center">
                {done ? (
                  <Check size={15} className="text-signal-low" aria-hidden="true" />
                ) : active ? (
                  <Loader2 size={15} className="animate-spin text-accent" aria-hidden="true" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-line-strong" aria-hidden="true" />
                )}
              </span>
              {stage}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
