import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Award, TriangleAlert } from 'lucide-react';
import type { ViralityAnalysis, ViralMoment } from '@shared/types.js';
import { computeViralityScore, countViralHighRiskMoments } from '@shared/analytics.js';
import VideoPlayer from '../components/VideoPlayer.js';
import ViralMomentTimeline from '../components/ViralMomentTimeline.js';
import ViralMomentInspector from '../components/ViralMomentInspector.js';
import ViralitySummaryCards from '../components/ViralitySummaryCards.js';
import ViralityRubricPanel from '../components/ViralityRubricPanel.js';
import { formatTimestamp } from '../lib/format.js';

interface Props {
  analysis: ViralityAnalysis;
  videoUrl: string | null;
  isSample: boolean;
  onBack: () => void;
}

export default function ViralityAnalysisPage({ analysis, videoUrl, isSample, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    analysis.overallSummary.biggestRiskMomentId || (analysis.moments[0]?.id ?? null)
  );

  const selected = useMemo(
    () => analysis.moments.find((m) => m.id === selectedId) ?? null,
    [analysis.moments, selectedId]
  );

  const viralityScore = useMemo(() => computeViralityScore(analysis), [analysis]);
  const highRiskMoments = useMemo(() => countViralHighRiskMoments(analysis), [analysis]);

  const byId = useCallback(
    (id: string) => analysis.moments.find((m) => m.id === id) ?? null,
    [analysis.moments]
  );

  const strongest = byId(analysis.overallSummary.strongestMomentId);
  const risk = byId(analysis.overallSummary.biggestRiskMomentId);

  /** Seek without playing: reading the report, not watching the clip yet. */
  const seek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(seconds)) return;
    try {
      video.pause();
      video.currentTime = Math.max(0, seconds);
    } catch {
      // Seeking before metadata loads can throw. Non-fatal.
    }
  }, []);

  const selectMoment = useCallback(
    (moment: ViralMoment) => {
      setSelectedId(moment.id);
      seek(moment.timestampSeconds);
      if (window.matchMedia('(max-width: 1023px)').matches) {
        inspectorRef.current?.scrollIntoView({ block: 'start' });
      }
    },
    [seek]
  );

  const jumpToMoment = useCallback(
    (id: string) => {
      const moment = byId(id);
      if (moment) selectMoment(moment);
    },
    [byId, selectMoment]
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Check another video
        </button>
        {isSample && (
          <span className="rounded-sm border border-line-strong bg-paper-raised px-2.5 py-1 text-xs font-medium tracking-wide text-ink-muted uppercase">
            Pre-analyzed sample
          </span>
        )}
      </div>

      <header className="mt-6 border-b border-line pb-8">
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">Virality check</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">
          {analysis.overallSummary.oneSentenceAssessment}
        </p>
      </header>

      <div className="mt-8">
        <ViralitySummaryCards
          viralityScore={viralityScore}
          highRiskMoments={highRiskMoments}
          momentCount={analysis.moments.length}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="space-y-6">
          <VideoPlayer
            ref={videoRef}
            src={videoUrl}
            durationSeconds={analysis.durationSeconds}
            placeholderNote={
              isSample
                ? 'The sample video has not been installed in this deployment. The analysis below is complete and fully interactive.'
                : undefined
            }
          />
          <ViralMomentTimeline
            moments={analysis.moments}
            durationSeconds={analysis.durationSeconds}
            selectedId={selectedId}
            onSelect={selectMoment}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {strongest && (
              <button
                type="button"
                onClick={() => jumpToMoment(strongest.id)}
                className="border border-line bg-paper-raised p-4 text-left transition-colors hover:border-signal-low"
              >
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-signal-low uppercase">
                  <Award size={13} aria-hidden="true" />
                  Strongest moment
                </h3>
                <p className="mt-1.5 text-sm tabular-nums text-ink-muted">
                  {formatTimestamp(strongest.timestampSeconds)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {strongest.observation}
                </p>
              </button>
            )}
            {risk && (
              <button
                type="button"
                onClick={() => jumpToMoment(risk.id)}
                className="border border-line bg-paper-raised p-4 text-left transition-colors hover:border-signal-high"
              >
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-signal-high uppercase">
                  <TriangleAlert size={13} aria-hidden="true" />
                  Biggest attention risk
                </h3>
                <p className="mt-1.5 text-sm tabular-nums text-ink-muted">
                  {formatTimestamp(risk.timestampSeconds)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{risk.observation}</p>
              </button>
            )}
          </div>
        </div>

        <div ref={inspectorRef} className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
          <h2 className="mb-2 font-display text-sm tracking-wide text-ink-soft uppercase">
            Selected moment
          </h2>
          <ViralMomentInspector moment={selected} />
        </div>
      </div>

      <div className="mt-14 space-y-14">
        <ViralityRubricPanel rubric={analysis.rubric} onSeek={seek} />
      </div>

      <footer className="mt-16 border-t border-line pt-5 text-xs leading-relaxed text-ink-muted">
        The virality potential heuristic is a structured preparation aid computed from the six
        rubric scores. It is not a prediction of views, shares, or platform performance. VC Mirror
        evaluates only what appears in the submitted video.
      </footer>
    </div>
  );
}
