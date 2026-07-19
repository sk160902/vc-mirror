import { useCallback, useEffect, useRef, useState } from 'react';
import type { PitchAnalysis, VerifiedClaim } from '@shared/types.js';
import HomePage from './pages/HomePage.js';
import AnalysisPage from './pages/AnalysisPage.js';
import ProcessingState, { PROCESSING_STAGES } from './components/ProcessingState.js';
import { analyzePitch, fetchSample, verifyClaims, ApiRequestError } from './lib/api.js';

type View =
  | { kind: 'home' }
  | { kind: 'processing' }
  | { kind: 'analysis'; analysis: PitchAnalysis; videoUrl: string | null; isSample: boolean };

export default function App() {
  const [view, setView] = useState<View>({ kind: 'home' });
  const [homeError, setHomeError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);

  const [verification, setVerification] = useState<VerifiedClaim[]>([]);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Tracked so uploaded object URLs are revoked rather than leaked on navigation.
  const objectUrlRef = useRef<string | null>(null);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  const runVerification = useCallback(async (analysisId: string) => {
    setVerificationPending(true);
    setVerificationError(null);
    try {
      const { verification: result } = await verifyClaims(analysisId);
      setVerification(result);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : 'We could not reach the verification service.';
      setVerificationError(message);
    } finally {
      setVerificationPending(false);
    }
  }, []);

  const handleAnalyze = useCallback(
    async (file: File, durationSeconds: number) => {
      setHomeError(null);
      setVerification([]);
      setVerificationError(null);
      setStage(0);
      setView({ kind: 'processing' });

      // Advance the visible stages while the single request is in flight. Stage
      // labels are honest about the work, and never reach "done" on their own.
      const timers = PROCESSING_STAGES.slice(1, -1).map((_, i) =>
        window.setTimeout(() => setStage(i + 1), (i + 1) * 4500)
      );

      try {
        const { analysis } = await analyzePitch(file, durationSeconds);
        timers.forEach(window.clearTimeout);
        setStage(PROCESSING_STAGES.length - 1);

        releaseObjectUrl();
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;

        setView({ kind: 'analysis', analysis, videoUrl: url, isSample: false });
        if (analysis.claimsToVerify.length > 0) void runVerification(analysis.analysisId);
      } catch (err) {
        timers.forEach(window.clearTimeout);
        const message =
          err instanceof ApiRequestError
            ? err.message
            : 'We could not complete the analysis. Please try again.';
        setHomeError(message);
        setView({ kind: 'home' });
      }
    },
    [releaseObjectUrl, runVerification]
  );

  const handleOpenSample = useCallback(async () => {
    setHomeError(null);
    try {
      const { analysis, verification: cached, sampleVideoUrl } = await fetchSample();
      releaseObjectUrl();
      setVerification(cached);
      setVerificationError(null);
      setVerificationPending(false);
      setView({ kind: 'analysis', analysis, videoUrl: sampleVideoUrl, isSample: true });
    } catch {
      setHomeError('The sample analysis could not be loaded. Please try again.');
    }
  }, [releaseObjectUrl]);

  const handleBack = useCallback(() => {
    releaseObjectUrl();
    setView({ kind: 'home' });
    setVerification([]);
    setVerificationError(null);
    setHomeError(null);
  }, [releaseObjectUrl]);

  if (view.kind === 'processing') {
    return (
      <main className="mx-auto max-w-5xl px-5">
        <ProcessingState activeStage={stage} />
      </main>
    );
  }

  if (view.kind === 'analysis') {
    return (
      <main>
        <AnalysisPage
          analysis={view.analysis}
          verification={verification}
          verificationPending={verificationPending}
          verificationError={verificationError}
          onRetryVerification={() => void runVerification(view.analysis.analysisId)}
          videoUrl={view.videoUrl}
          isSample={view.isSample}
          onBack={handleBack}
        />
      </main>
    );
  }

  return (
    <main>
      <HomePage
        onAnalyze={(file, duration) => void handleAnalyze(file, duration)}
        onOpenSample={() => void handleOpenSample()}
        busy={false}
        error={homeError}
      />
    </main>
  );
}
