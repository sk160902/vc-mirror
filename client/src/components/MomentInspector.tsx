import { Quote, Ear, TriangleAlert, HelpCircle, Sparkles } from 'lucide-react';
import { MOMENT_LABELS } from '@shared/constants.js';
import type { TimelineEvent } from '@shared/types.js';
import { formatTimestamp, momentTone } from '../lib/format.js';

interface Props {
  event: TimelineEvent | null;
}

function Block({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
        <span className="text-ink-muted" aria-hidden="true">
          {icon}
        </span>
        {label}
      </h4>
      <div className="mt-1.5 text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export default function MomentInspector({ event }: Props) {
  if (!event) {
    return (
      <div className="border border-line bg-paper-raised p-6">
        <p className="text-sm text-ink-muted">
          Select a moment on the timeline to see what an investor is likely to take from it.
        </p>
      </div>
    );
  }

  const tone = momentTone(event.type, event.severity);

  return (
    <div key={event.id} className="vcm-enter border border-line bg-paper-raised">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className="font-display text-lg tabular-nums">
          {formatTimestamp(event.timestampSeconds)}
        </span>
        <span className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
          {MOMENT_LABELS[event.type]}
        </span>
        <span className="text-xs text-ink-muted capitalize">{event.severity} severity</span>
      </div>

      <div className="space-y-5 p-5">
        <Block icon={<Quote size={13} />} label="What you said">
          <blockquote className={`border-l-2 pl-3 italic ${tone.rail.replace('bg-', 'border-')}`}>
            “{event.quote}”
          </blockquote>
        </Block>

        <Block icon={<Ear size={13} />} label="What an investor may hear">
          <p>{event.investorInterpretation}</p>
        </Block>

        <Block icon={<TriangleAlert size={13} />} label="Why it matters">
          <p>{event.whyItMatters}</p>
        </Block>

        {event.missingInformation.length > 0 && (
          <Block icon={<HelpCircle size={13} />} label="What is missing">
            <ul className="list-disc space-y-1 pl-4 marker:text-line-strong">
              {event.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Block>
        )}

        {event.strongerWording && (
          <div className="border border-accent/25 bg-accent-soft p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
              <Sparkles size={13} aria-hidden="true" />
              Stronger wording
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">“{event.strongerWording}”</p>
          </div>
        )}
      </div>
    </div>
  );
}
