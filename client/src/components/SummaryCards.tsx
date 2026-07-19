import { Info } from 'lucide-react';
import type { AnalysisAnalytics } from '@shared/types.js';

interface Props {
  analytics: AnalysisAnalytics;
  verificationPending: boolean;
}

function Card({
  label,
  value,
  hint,
  tooltip,
}: {
  label: string;
  value: string;
  hint: string;
  tooltip?: string;
}) {
  return (
    <div className="border border-line bg-paper-raised p-4">
      <div className="flex items-start gap-1">
        <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</h3>
        {tooltip && (
          <span className="group relative inline-flex">
            <Info size={12} className="mt-0.5 text-ink-muted" aria-hidden="true" />
            <span className="sr-only">{tooltip}</span>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-52 -translate-x-1/2 rounded-sm bg-ink px-2.5 py-1.5 text-xs leading-snug text-paper opacity-0 transition-opacity group-hover:opacity-100"
            >
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

export default function SummaryCards({ analytics, verificationPending }: Props) {
  const coverage =
    analytics.evidenceCoveragePercent === null
      ? '—'
      : `${analytics.evidenceCoveragePercent}%`;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        label="Pitch readiness heuristic"
        value={`${analytics.readinessScore}`}
        hint="Computed from the six rubric scores"
        tooltip="This is a structured preparation aid, not a prediction of funding."
      />
      <Card
        label="High-risk moments"
        value={`${analytics.highRiskMoments}`}
        hint="High severity, non-positive moments"
      />
      <Card
        label="Evidence coverage"
        value={verificationPending ? '…' : coverage}
        hint={
          analytics.evidenceCoveragePercent === null && !verificationPending
            ? 'No externally checkable claims found'
            : 'Checked claims with a grounded source'
        }
      />
      <Card
        label="Questions to prepare"
        value={`${analytics.questionsToPrepare}`}
        hint="Tied to specific weaknesses"
      />
    </div>
  );
}
