import { Quote, Eye, TriangleAlert, Sparkles } from 'lucide-react';
import { VIRAL_MOMENT_LABELS } from '@shared/constants.js';
import type { ViralMoment } from '@shared/types.js';
import { formatTimestamp, viralMomentTone } from '../lib/format.js';

interface Props {
  moment: ViralMoment | null;
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

export default function ViralMomentInspector({ moment }: Props) {
  if (!moment) {
    return (
      <div className="border border-line bg-paper-raised p-6">
        <p className="text-sm text-ink-muted">
          Select a moment on the timeline to see what was observed and why it matters.
        </p>
      </div>
    );
  }

  const tone = viralMomentTone(moment.type, moment.severity);

  return (
    <div key={moment.id} className="vcm-enter border border-line bg-paper-raised">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <span className="font-display text-lg tabular-nums">
          {formatTimestamp(moment.timestampSeconds)}
        </span>
        <span className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
          {VIRAL_MOMENT_LABELS[moment.type]}
        </span>
        <span className="text-xs text-ink-muted capitalize">{moment.severity} severity</span>
      </div>

      <div className="space-y-5 p-5">
        <Block icon={<Quote size={13} />} label="What happens">
          <blockquote className={`border-l-2 pl-3 italic ${tone.rail.replace('bg-', 'border-')}`}>
            “{moment.quote}”
          </blockquote>
        </Block>

        <Block icon={<Eye size={13} />} label="What was observed">
          <p>{moment.observation}</p>
        </Block>

        <Block icon={<TriangleAlert size={13} />} label="Why it matters">
          <p>{moment.whyItMatters}</p>
        </Block>

        {moment.suggestedFix && (
          <div className="border border-accent/25 bg-accent-soft p-4">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
              <Sparkles size={13} aria-hidden="true" />
              Suggested fix
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{moment.suggestedFix}</p>
          </div>
        )}
      </div>
    </div>
  );
}
