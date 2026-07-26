import type { MomentType, Severity, ViralMomentType } from '@shared/types.js';

export { formatTimestamp } from '@shared/analytics.js';

const POSITIVE: MomentType[] = ['conviction_builder', 'strong_moment'];

export function isPositiveMoment(type: MomentType): boolean {
  return POSITIVE.includes(type);
}

const POSITIVE_VIRAL: ViralMomentType[] = ['hook', 'energy_peak', 'standout_line'];

export function isPositiveViralMoment(type: ViralMomentType): boolean {
  return POSITIVE_VIRAL.includes(type);
}

/** Marker + badge colour driven by whether the moment helps or hurts, then by severity. */
export function viralMomentTone(
  type: ViralMomentType,
  severity: Severity
): { dot: string; badge: string; rail: string } {
  if (isPositiveViralMoment(type)) {
    return {
      dot: 'bg-signal-low',
      badge: 'bg-signal-low/10 text-signal-low border-signal-low/25',
      rail: 'bg-signal-low',
    };
  }
  if (severity === 'high') {
    return {
      dot: 'bg-signal-high',
      badge: 'bg-signal-high/10 text-signal-high border-signal-high/25',
      rail: 'bg-signal-high',
    };
  }
  return {
    dot: 'bg-signal-medium',
    badge: 'bg-signal-medium/10 text-signal-medium border-signal-medium/25',
    rail: 'bg-signal-medium',
  };
}

/** Marker + badge colour driven by whether the moment helps or hurts, then by severity. */
export function momentTone(type: MomentType, severity: Severity): {
  dot: string;
  badge: string;
  rail: string;
} {
  if (isPositiveMoment(type)) {
    return {
      dot: 'bg-signal-low',
      badge: 'bg-signal-low/10 text-signal-low border-signal-low/25',
      rail: 'bg-signal-low',
    };
  }
  if (severity === 'high') {
    return {
      dot: 'bg-signal-high',
      badge: 'bg-signal-high/10 text-signal-high border-signal-high/25',
      rail: 'bg-signal-high',
    };
  }
  return {
    dot: 'bg-signal-medium',
    badge: 'bg-signal-medium/10 text-signal-medium border-signal-medium/25',
    rail: 'bg-signal-medium',
  };
}

export function statusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
