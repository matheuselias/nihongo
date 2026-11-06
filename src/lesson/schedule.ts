export type Grade = 'wrong' | 'hard' | 'good' | 'easy';
export type CardState = { intervalDays: number; ease: number; due: Date };

/** Tuning knobs. */
export const SCHEDULE = {
  initialEase: 2.5,
  minEase: 1.3,
  firstIntervalDays: { hard: 1, good: 2, easy: 4 },
  wrongIntervalDays: 1,
  hardMultiplier: 1.2,
  easyBonus: 1.3,
  easeDelta: { wrong: -0.2, hard: -0.15, good: 0, easy: 0.15 },
};

const DAY_MS = 86_400_000;

/** Simplified SM-2. `state` is null for a card never answered. Fractional intervals are kept as is. */
export function schedule(state: CardState | null, grade: Grade, now: Date): CardState {
  const prevEase = state?.ease ?? SCHEDULE.initialEase;
  const ease = Math.max(SCHEDULE.minEase, prevEase + SCHEDULE.easeDelta[grade]);
  let intervalDays: number;
  if (grade === 'wrong') intervalDays = SCHEDULE.wrongIntervalDays;
  else if (!state) intervalDays = SCHEDULE.firstIntervalDays[grade];
  else if (grade === 'hard') intervalDays = state.intervalDays * SCHEDULE.hardMultiplier;
  else if (grade === 'good') intervalDays = state.intervalDays * prevEase;
  else intervalDays = state.intervalDays * prevEase * SCHEDULE.easyBonus;
  return { intervalDays, ease, due: new Date(now.getTime() + intervalDays * DAY_MS) };
}
