import { ExternalLink, RotateCw, Search } from 'lucide-react';
import type { ClaimToVerify, VerifiedClaim } from '@shared/types.js';
import { formatTimestamp, statusLabel } from '../lib/format.js';

interface Props {
  claims: ClaimToVerify[];
  verification: VerifiedClaim[];
  pending: boolean;
  error: string | null;
  onRetry: () => void;
  onSeek: (seconds: number) => void;
}

const STATUS_TONE: Record<VerifiedClaim['status'], string> = {
  supported: 'bg-signal-low/10 text-signal-low border-signal-low/25',
  partially_supported: 'bg-signal-medium/10 text-signal-medium border-signal-medium/25',
  contradicted: 'bg-signal-high/10 text-signal-high border-signal-high/25',
  insufficient_evidence: 'bg-line/60 text-ink-muted border-line-strong',
};

function Heading() {
  return (
    <>
      <h2
        id="verification-heading"
        className="font-display text-sm tracking-wide text-ink-soft uppercase"
      >
        Claim verification
      </h2>
      <p className="mt-1 mb-4 text-sm text-ink-muted">
        Externally checkable claims are searched with Google Search grounding. Sources below are
        taken from the actual grounded citations returned by the search tool.
      </p>
    </>
  );
}

export default function ClaimVerification({
  claims,
  verification,
  pending,
  error,
  onRetry,
  onSeek,
}: Props) {
  if (claims.length === 0) {
    return (
      <section aria-labelledby="verification-heading">
        <Heading />
        <p className="border border-line bg-paper-raised p-5 text-sm text-ink-muted">
          No externally verifiable quantitative claims were detected in this pitch.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="verification-heading">
      <Heading />

      <div className="space-y-4">
        {claims.map((claim) => {
          const result = verification.find((v) => v.claimId === claim.id);

          return (
            <div key={claim.id} className="border border-line bg-paper-raised">
              <div className="border-b border-line p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => onSeek(claim.timestampSeconds)}
                  className="text-xs tabular-nums text-ink-muted underline underline-offset-4 hover:text-ink"
                >
                  {formatTimestamp(claim.timestampSeconds)}
                </button>
                <blockquote className="mt-1.5 font-display text-lg leading-snug">
                  “{claim.claim}”
                </blockquote>
              </div>

              {pending && !result && (
                <div className="flex items-center gap-2.5 p-5 text-sm text-ink-muted">
                  <Search size={15} className="animate-pulse" aria-hidden="true" />
                  Searching for evidence…
                </div>
              )}

              {!pending && !result && error && (
                <div className="p-5">
                  <p className="text-sm text-ink-soft">External verification unavailable.</p>
                  <p className="mt-1 text-sm text-ink-muted">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-ink px-3 py-1.5 text-sm transition-colors hover:bg-ink hover:text-paper"
                  >
                    <RotateCw size={13} aria-hidden="true" />
                    Retry verification
                  </button>
                </div>
              )}

              {result && (
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[result.status]}`}
                    >
                      {statusLabel(result.status)}
                    </span>
                    <span className="text-xs text-ink-muted">
                      Evidence strength: {result.evidenceStrength}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-ink-soft">{result.explanation}</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {result.evidenceFor.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                          Evidence for
                        </h4>
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink-soft marker:text-line-strong">
                          {result.evidenceFor.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.evidenceAgainst.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                          Evidence against
                        </h4>
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink-soft marker:text-line-strong">
                          {result.evidenceAgainst.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {result.missingContext.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                        Missing context
                      </h4>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink-soft marker:text-line-strong">
                        {result.missingContext.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border border-accent/25 bg-accent-soft p-4">
                    <h4 className="text-xs font-semibold tracking-wide text-accent uppercase">
                      Safer wording
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink">
                      “{result.saferWording}”
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                      Sources
                    </h4>
                    {result.sources.length === 0 ? (
                      <p className="mt-1.5 text-sm text-ink-muted">
                        No grounded citations were returned for this claim.
                      </p>
                    ) : (
                      <ul className="mt-1.5 space-y-1.5">
                        {result.sources.map((s) => (
                          <li key={s.url}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex items-start gap-1.5 text-sm text-ink-soft hover:text-accent"
                            >
                              <ExternalLink
                                size={13}
                                className="mt-0.5 shrink-0 text-ink-muted group-hover:text-accent"
                                aria-hidden="true"
                              />
                              <span>
                                {s.title}
                                {s.publisher && (
                                  <span className="text-ink-muted"> · {s.publisher}</span>
                                )}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
