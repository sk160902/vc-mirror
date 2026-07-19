export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB, inline base64 path
export const MAX_EXPECTED_DURATION_SECONDS = 60;
export const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/webm'] as const;
export const ACCEPTED_EXTENSIONS = ['.mp4', '.webm'] as const;

export const MAX_TIMELINE_EVENTS = 6;
export const TARGET_INVESTOR_QUESTIONS = 3;
export const MAX_CLAIMS_TO_VERIFY = 1; // first working version verifies one claim

export const RUBRIC_DIMENSIONS = [
  'problem_urgency',
  'solution_clarity',
  'evidence_traction',
  'market_gtm',
  'differentiation_defensibility',
  'delivery_structure',
] as const;

export const RUBRIC_LABELS: Record<(typeof RUBRIC_DIMENSIONS)[number], string> = {
  problem_urgency: 'Problem urgency',
  solution_clarity: 'Solution clarity',
  evidence_traction: 'Evidence and traction',
  market_gtm: 'Market and go-to-market',
  differentiation_defensibility: 'Differentiation and defensibility',
  delivery_structure: 'Delivery and structure',
};

export const MOMENT_TYPES = [
  'conviction_builder',
  'clarity_gap',
  'evidence_gap',
  'investor_objection',
  'defensibility_risk',
  'strong_moment',
] as const;

export const MOMENT_LABELS: Record<(typeof MOMENT_TYPES)[number], string> = {
  conviction_builder: 'Conviction builder',
  clarity_gap: 'Clarity gap',
  evidence_gap: 'Evidence gap',
  investor_objection: 'Investor objection',
  defensibility_risk: 'Defensibility risk',
  strong_moment: 'Strong moment',
};

export const POSITIVE_MOMENT_TYPES = ['conviction_builder', 'strong_moment'] as const;

export const MAX_RUBRIC_SCORE = 5;
export const NOT_ESTABLISHED = 'Not established in the pitch.';
