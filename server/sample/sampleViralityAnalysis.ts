import type { ViralityAnalysis } from '../../shared/types.js';

/**
 * Hand-authored fixture used only in USE_MOCK_GEMINI mode, so the full
 * upload -> analyze -> render path can be exercised without a live model call.
 * Not derived from a real video; not presented to users as a real analysis.
 */
export const SAMPLE_VIRALITY_ANALYSIS: ViralityAnalysis = {
  analysisId: 'mock-virality-v1',
  durationSeconds: 24,
  rubric: [
    {
      dimension: 'hook_strength',
      score: 4,
      summary:
        'The first two seconds open mid-motion on a surprising visual, which reads as an effective scroll-stopper.',
      evidenceTimestamps: [0, 2],
    },
    {
      dimension: 'emotional_intensity',
      score: 3,
      summary: 'Energy is high through the middle section but flattens noticeably before the end.',
      evidenceTimestamps: [3, 18],
    },
    {
      dimension: 'facial_expressiveness',
      score: 4,
      summary: 'Wide, varied expression and consistent eye contact with the camera throughout.',
      evidenceTimestamps: [2, 9, 15],
    },
    {
      dimension: 'vocal_dynamics',
      score: 2,
      summary:
        'Pitch stays fairly flat after the opening line; the delivery does not vary pace to match the content.',
      evidenceTimestamps: [6, 14],
    },
    {
      dimension: 'pacing_editing',
      score: 3,
      summary: 'Cuts are frequent early on but slow down noticeably in the back half.',
      evidenceTimestamps: [16, 20],
    },
    {
      dimension: 'shareability_trigger',
      score: 3,
      summary: 'One quotable line lands around the middle; nothing comparable follows it.',
      evidenceTimestamps: [9],
    },
  ],
  moments: [
    {
      id: 'm1',
      timestampSeconds: 0,
      endTimestampSeconds: 2,
      type: 'hook',
      severity: 'low',
      quote: 'Opens mid-motion, camera already close on the subject.',
      observation: 'No slow build-up; the video starts on the surprising moment itself.',
      whyItMatters: 'A cold open on the peak moment is one of the strongest known hook patterns.',
      suggestedFix: null,
    },
    {
      id: 'm2',
      timestampSeconds: 9,
      endTimestampSeconds: null,
      type: 'standout_line',
      severity: 'low',
      quote: '"I did not think it would actually work."',
      observation: 'Delivered with a raised pitch and a pause immediately after.',
      whyItMatters: 'A short, quotable line like this is what gets clipped and shared on its own.',
      suggestedFix: null,
    },
    {
      id: 'm3',
      timestampSeconds: 16,
      endTimestampSeconds: 22,
      type: 'flat_moment',
      severity: 'high',
      quote: 'Explanation continues over a static shot.',
      observation: 'Cut frequency drops and vocal pitch stays level for six seconds.',
      whyItMatters: 'This is the most likely point in the video where a viewer scrolls away.',
      suggestedFix: 'Cut this section by half and move any essential detail earlier, into the higher-energy middle section.',
    },
  ],
  overallSummary: {
    strongestMomentId: 'm1',
    biggestRiskMomentId: 'm3',
    oneSentenceAssessment:
      'A strong cold open and one quotable line carry the video, but pacing and vocal energy drop off before the end.',
  },
};
