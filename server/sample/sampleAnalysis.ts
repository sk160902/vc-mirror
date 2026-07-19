import type { PitchAnalysis, VerifiedClaim } from '../../shared/types.js';

/**
 * Pre-analyzed sample. Hand-authored fixture used for the labeled sample path.
 * This is NEVER presented as a live model call: the UI labels it
 * "Pre-analyzed sample" wherever it appears.
 */
export const SAMPLE_ANALYSIS: PitchAnalysis = {
  analysisId: 'sample-mise-v1',
  durationSeconds: 58,
  company: {
    name: 'Mise',
    problem:
      'Independent restaurants track inventory on paper and spreadsheets, so they over-order perishable stock and discover the loss only at month end.',
    customer:
      'Stated broadly as "restaurants". The pitch does not narrow to a segment, size band, or region.',
    solution:
      'A phone camera scans the walk-in cooler and shelves, and the system produces a running inventory count and reorder suggestions.',
    businessModel: 'Not established in the pitch.',
    missingInformation: [
      'Pricing or revenue model',
      'Current customer count or pilot results',
      'How the product is sold or distributed',
      'Named competitors',
    ],
  },
  rubric: [
    {
      dimension: 'problem_urgency',
      score: 4,
      summary:
        'The pain is concrete and told from operator experience, though its financial size is asserted rather than shown.',
      evidenceTimestamps: [4, 11],
    },
    {
      dimension: 'solution_clarity',
      score: 4,
      summary:
        'The mechanism is explained plainly and demonstrated on screen, which makes it easy to picture in use.',
      evidenceTimestamps: [22],
    },
    {
      dimension: 'evidence_traction',
      score: 1,
      summary:
        'No customers, pilots, retention, or usage data appear anywhere in the pitch. Not established in the pitch.',
      evidenceTimestamps: [],
    },
    {
      dimension: 'market_gtm',
      score: 2,
      summary:
        'A large global waste figure is cited, but the reachable segment and the route to reach it are absent.',
      evidenceTimestamps: [11, 34],
    },
    {
      dimension: 'differentiation_defensibility',
      score: 2,
      summary:
        'The pitch claims no competitors exist rather than explaining why this approach is hard to copy.',
      evidenceTimestamps: [41],
    },
    {
      dimension: 'delivery_structure',
      score: 4,
      summary:
        'Clear arc from problem to product with steady pacing. The close states no specific ask.',
      evidenceTimestamps: [4, 52],
    },
  ],
  timeline: [
    {
      id: 'm1',
      timestampSeconds: 4,
      endTimestampSeconds: 10,
      type: 'conviction_builder',
      severity: 'low',
      quote:
        'I ran a twelve table restaurant for six years, and every Sunday I threw away produce I had personally ordered four days earlier.',
      observation:
        'Opens with lived operator experience rather than an abstract market description.',
      investorInterpretation:
        'This founder has the problem in their hands, not from a report. Credibility goes up early.',
      whyItMatters:
        'Founder-problem fit is the cheapest trust an early pitch can buy, and it front-loads it in the first ten seconds.',
      missingInformation: [],
      strongerWording: null,
    },
    {
      id: 'm2',
      timestampSeconds: 11,
      endTimestampSeconds: 18,
      type: 'evidence_gap',
      severity: 'high',
      quote: 'The restaurant industry wastes over a hundred and sixty billion dollars of food a year.',
      observation:
        'A large external figure is stated without a source, a year, or a scope boundary.',
      investorInterpretation:
        'That number is probably global and probably includes waste this product cannot touch. What slice is actually addressable?',
      whyItMatters:
        'Quoting a headline figure that dwarfs the reachable market invites the investor to discount every later number in the pitch.',
      missingInformation: [
        'Source and year for the figure',
        'Geographic scope',
        'How much of that waste is addressable by inventory tooling',
      ],
      strongerWording:
        'US independent restaurants lose roughly four to ten percent of food purchases to spoilage. For a single location doing one million dollars a year, that is forty to one hundred thousand dollars we can attack directly.',
    },
    {
      id: 'm3',
      timestampSeconds: 22,
      endTimestampSeconds: 30,
      type: 'strong_moment',
      severity: 'low',
      quote:
        'You point your phone at the shelf, and thirty seconds later the count is done. No barcodes, no clipboard.',
      observation:
        'The core mechanism is stated in one sentence and shown on screen at the same time.',
      investorInterpretation:
        'I understand exactly what the product does and why it beats a clipboard. This is demoable.',
      whyItMatters:
        'A product an investor can picture in thirty seconds survives being retold to their partners without the founder present.',
      missingInformation: [],
      strongerWording: null,
    },
    {
      id: 'm4',
      timestampSeconds: 34,
      endTimestampSeconds: 40,
      type: 'clarity_gap',
      severity: 'high',
      quote: 'Every restaurant in the world needs this.',
      observation:
        'The customer definition widens to the largest possible set at the moment it should narrow.',
      investorInterpretation:
        'Who is the first hundred paying locations, and what do they have in common? A universal customer is usually no customer.',
      whyItMatters:
        'Seed investors fund a wedge, not a universe. An undefined beachhead makes go-to-market unfundable even when the product is good.',
      missingInformation: [
        'Beachhead segment',
        'Which locations feel this pain most acutely',
        'Purchase trigger and buyer within the restaurant',
      ],
      strongerWording:
        'We start with independent full service restaurants doing one to three million dollars a year in dense urban markets, where produce spoilage is highest and there is no corporate inventory system already installed.',
    },
    {
      id: 'm5',
      timestampSeconds: 41,
      endTimestampSeconds: 48,
      type: 'defensibility_risk',
      severity: 'high',
      quote: 'Nobody else is doing this. We have no competitors.',
      observation:
        'Defensibility is asserted by claiming an empty field rather than by describing a durable advantage.',
      investorInterpretation:
        'Either the market is empty because it does not pay, or the research is incomplete. Both readings hurt.',
      whyItMatters:
        'This is the single most common unforced error in seed pitches, and experienced investors treat it as a research signal rather than a market signal.',
      missingInformation: [
        'Named adjacent products',
        'Why incumbents have not shipped this',
        'What compounds as more kitchens use it',
      ],
      strongerWording:
        'Inventory tools like MarketMan and BlueCart digitize ordering but still rely on someone counting by hand. Our advantage compounds: every scan improves recognition of the specific containers and package formats these kitchens actually use.',
    },
    {
      id: 'm6',
      timestampSeconds: 52,
      endTimestampSeconds: 58,
      type: 'investor_objection',
      severity: 'medium',
      quote: 'So that is Mise. Thanks for watching.',
      observation: 'The pitch ends without a raise amount, a use of funds, or a next step.',
      investorInterpretation:
        'What are you raising, what does it buy, and what do you want from me right now?',
      whyItMatters:
        'A close without an ask forces the investor to invent the next step, and most will simply not take one.',
      missingInformation: ['Raise amount', 'Use of funds', 'Specific next step for the viewer'],
      strongerWording:
        'We are raising a seed round to put the product into fifty paid kitchens across two cities and prove that measured spoilage drops. If you invest in restaurant operations, I would like twenty minutes.',
    },
  ],
  investorQuestions: [
    {
      id: 'q1',
      question:
        'Who are the first hundred paying locations, and what makes them buy before anyone else does?',
      reason:
        'At 00:34 the customer widens to every restaurant in the world, which leaves the beachhead undefined.',
      triggerTimestampSeconds: 34,
      answerFramework: [
        'Name one narrow segment and the property that makes spoilage worst for them',
        'Describe the buyer inside the restaurant and their purchase trigger',
        'Give the channel that reaches that segment repeatedly',
      ],
    },
    {
      id: 'q2',
      question:
        'Why has an existing inventory or POS vendor not shipped camera counting already?',
      reason:
        'At 00:41 defensibility rests on the claim that no competitors exist rather than on a durable advantage.',
      triggerTimestampSeconds: 41,
      answerFramework: [
        'Name the adjacent products honestly',
        'Explain the structural reason incumbents have not done it',
        'State what compounds with usage and is therefore hard to copy',
      ],
    },
    {
      id: 'q3',
      question:
        'What evidence do you have that a kitchen keeps using this after week three?',
      reason:
        'The evidence and traction dimension scores lowest: no pilots, usage, or retention data appear in the pitch.',
      triggerTimestampSeconds: null,
      answerFramework: [
        'Give whatever real usage data exists, even if small',
        'State the retention metric you are managing to',
        'Describe the habit loop that survives a busy service',
      ],
    },
  ],
  claimsToVerify: [
    {
      id: 'c1',
      claim: 'The restaurant industry wastes over 160 billion dollars of food per year.',
      timestampSeconds: 11,
      importance: 5,
      verificationQuery: 'restaurant industry annual food waste value United States billions',
    },
  ],
  overallSummary: {
    strongestMomentId: 'm3',
    biggestConcernMomentId: 'm5',
    oneSentenceAssessment:
      'A credible operator with a demoable product, held back by an undefined beachhead and a defensibility answer that asserts an empty market instead of a durable advantage.',
  },
};

/**
 * Cached verification for the sample. Sources here were resolved from real
 * grounded citations at fixture authoring time.
 */
export const SAMPLE_VERIFICATION: VerifiedClaim[] = [
  {
    claimId: 'c1',
    status: 'partially_supported',
    explanation:
      'Figures in this range are commonly reported, but they typically describe food waste across the entire US food system or all of food service, not the restaurant industry alone. The order of magnitude is defensible; the attribution in the pitch is broader than the source supports.',
    evidenceFor: [
      'Multiple industry and government sources place US food waste in the hundreds of billions of dollars annually.',
      'Food service is consistently identified as one of the largest contributing sectors.',
    ],
    evidenceAgainst: [
      'The most cited figures cover the whole food system rather than restaurants specifically.',
      'Restaurant-only estimates are generally reported well below the number stated in the pitch.',
    ],
    missingContext: [
      'Whether the figure is US or global',
      'Whether it covers all food service or restaurants only',
      'The year and methodology behind the estimate',
    ],
    saferWording:
      'Food waste across the US food system runs into the hundreds of billions of dollars a year, and restaurants are one of the largest contributors.',
    evidenceStrength: 'moderate',
    sources: [
      {
        title: 'Food Waste FAQs',
        publisher: 'usda.gov',
        url: 'https://www.usda.gov/foodwaste/faqs',
      },
      {
        title: 'Wasted: How America Is Losing Up to 40 Percent of Its Food',
        publisher: 'nrdc.org',
        url: 'https://www.nrdc.org/resources/wasted-how-america-losing-40-percent-its-food-farm-fork-landfill',
      },
    ],
  },
];
