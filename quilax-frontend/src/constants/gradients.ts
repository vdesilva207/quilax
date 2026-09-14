import { Colors } from '@/constants/theme';

/**
 * Brand gradient — more red weight on the right (user request).
 * Blue → purple early, then red dominates the right half.
 */
export const APP_GRADIENT = [
  Colors.light.gradientStart, // blue
  Colors.light.gradientMiddle, // purple
  Colors.light.gradientEnd, // red
  '#DC2626', // deeper red
] as const;

/** Color stops: push red into the right ~45% of the bar */
export const APP_GRADIENT_LOCATIONS = [0, 0.28, 0.55, 1] as const;

export const APP_GRADIENT_SOFT = ['#EFF6FF', '#F5F3FF', '#FEE2E2', '#FEF2F2'] as const;

export const SCREEN_BACKGROUND = Colors.light.background;

/** Marketing / Gestión gate — thin top brand stripe */
export const GRADIENT_BAR_HEIGHT = 4;


export const SECTION_ACCENTS = [
  Colors.light.gradientStart,
  Colors.light.gradientMiddle,
  Colors.light.purple,
  Colors.light.pink,
] as const;

export const GRADIENT_DIAGONAL = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

export const GRADIENT_VERTICAL = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
} as const;

export const GRADIENT_HORIZONTAL = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
} as const;

/** Spread props onto LinearGradient for consistent brand look */
export const brandGradientProps = {
  colors: [...APP_GRADIENT] as string[],
  locations: [...APP_GRADIENT_LOCATIONS] as number[],
  ...GRADIENT_DIAGONAL,
};

type GradientStop = { pos: number; color: string };

const BRAND_STOPS: GradientStop[] = [
  { pos: 0, color: Colors.light.gradientStart },
  { pos: 0.28, color: Colors.light.gradientMiddle },
  { pos: 0.55, color: Colors.light.gradientEnd },
  { pos: 1, color: '#DC2626' },
];

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

function lerpColor(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const u = Math.max(0, Math.min(1, t));
  return rgbToHex(
    A.r + (B.r - A.r) * u,
    A.g + (B.g - A.g) * u,
    A.b + (B.b - A.b) * u,
  );
}

function sampleBrandGradient(x: number) {
  const stops = BRAND_STOPS;
  if (x <= stops[0].pos) return stops[0].color;
  if (x >= stops[stops.length - 1].pos) return stops[stops.length - 1].color;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (x >= a.pos && x <= b.pos) {
      const u = (x - a.pos) / (b.pos - a.pos || 1);
      return lerpColor(a.color, b.color, u);
    }
  }
  return stops[stops.length - 1].color;
}

/**
 * Onboarding CTA gradient: pans a viewport across the brand spectrum.
 * Step 0 → mostly red (right end). Last step → mostly blue (left end).
 * Blue enters from the left as the user advances.
 */
export function onboardingCtaGradientProps(stepIndex: number, stepCount: number) {
  const last = Math.max(1, stepCount - 1);
  const t = Math.max(0, Math.min(1, stepIndex / last));

  // Narrow window so extremes read as solid red / solid blue
  const VIEWPORT = 0.2;
  const left = (1 - VIEWPORT) * (1 - t);
  const right = left + VIEWPORT;

  const colors: string[] = [sampleBrandGradient(left)];
  const locations: number[] = [0];

  for (const stop of BRAND_STOPS) {
    if (stop.pos > left + 0.001 && stop.pos < right - 0.001) {
      colors.push(stop.color);
      locations.push((stop.pos - left) / VIEWPORT);
    }
  }

  colors.push(sampleBrandGradient(right));
  locations.push(1);

  return {
    colors,
    locations,
    ...GRADIENT_HORIZONTAL,
  };
}
