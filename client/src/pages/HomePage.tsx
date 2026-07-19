import { useState } from 'react';
import { ArrowRight, Crosshair, MessageCircleQuestion, ShieldCheck } from 'lucide-react';
import VideoUploader from '../components/VideoUploader.js';

interface Props {
  onAnalyze: (file: File, durationSeconds: number) => void;
  onOpenSample: () => void;
  busy: boolean;
  error: string | null;
}

const VALUE_POINTS = [
  {
    icon: Crosshair,
    title: 'Find the weak moment',
    body: 'Feedback is attached to the exact second it happens, not summarized at the end.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify the claim',
    body: 'Checkable numbers are searched against live sources, with the citations shown.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Prepare the hard question',
    body: 'Three questions drawn from the specific gaps in your pitch, with answer structure.',
  },
];

export default function HomePage({ onAnalyze, onOpenSample, busy, error }: Props) {
  const [selected, setSelected] = useState<{ file: File; duration: number } | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:py-20">
      <header className="max-w-2xl">
        <p className="font-display text-sm tracking-[0.2em] text-accent uppercase">VC Mirror</p>
        <h1 className="mt-4 font-display text-4xl leading-[1.1] sm:text-5xl">
          See what investors hear, not what you think you said.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          Upload a short pitch video. VC Mirror marks the exact moments that build or break
          conviction, checks the claims an investor would look up, and tells you which questions
          are coming.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <div>
          <VideoUploader
            onSelected={(file, duration) => setSelected({ file, duration })}
            onCleared={() => setSelected(null)}
            disabled={busy}
          />

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={!selected || busy}
              onClick={() => selected && onAnalyze(selected.file, selected.duration)}
              className="inline-flex items-center gap-2 rounded-sm bg-ink px-6 py-3 font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Analyze my pitch
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenSample}
              disabled={busy}
              className="text-sm text-ink-soft underline underline-offset-4 hover:text-accent disabled:opacity-40"
            >
              View sample analysis
            </button>
          </div>

          {!selected && (
            <p className="mt-3 text-xs text-ink-muted">
              Choose a video to enable analysis, or open the pre-analyzed sample.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-signal-high bg-signal-high/5 py-2.5 pl-3 text-sm text-signal-high"
            >
              {error}
            </p>
          )}

          <p className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
            Your video is sent to Google Gemini for analysis and is not stored in any VC Mirror
            database. Google may process or temporarily retain uploaded content under its own
            service terms.
          </p>
        </div>

        <ul className="space-y-7 lg:pt-2">
          {VALUE_POINTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <Icon
                size={18}
                className="mt-0.5 shrink-0 text-accent"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <div>
                <h2 className="font-display text-lg">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
