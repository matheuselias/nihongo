import type { Content } from '@/content/load';
import type { CardDirection, CardRecord } from '@/db/progress-repository';

export type DeckCard = { wordId: string; direction: CardDirection };

const key = (c: DeckCard) => `${c.wordId}/${c.direction}`;

/** Two cards per `generates_card` word shown in a `present` step of a completed lesson, in trail order. */
export function deckCards(content: Content, completed: ReadonlySet<string>): DeckCard[] {
  const seen = new Set<string>();
  const cards: DeckCard[] = [];
  for (const section of content.sections)
    for (const lesson of section.lessons) {
      if (!completed.has(lesson.id)) continue;
      for (const step of lesson.steps) {
        if (step.type !== 'present' || seen.has(step.word) || !content.words[step.word]?.generates_card) continue;
        seen.add(step.word);
        cards.push({ wordId: step.word, direction: 'jp_to_pt' }, { wordId: step.word, direction: 'pt_to_jp' });
      }
    }
  return cards;
}

/** Due cards first (most overdue first), then new ones in trail order. Answered, not-yet-due cards stay out. */
export function buildQueue(deck: DeckCard[], states: CardRecord[], now: Date, size = 20): DeckCard[] {
  const byKey = new Map(states.map((s) => [key(s), s]));
  const due = deck
    .filter((c) => (byKey.get(key(c))?.due.getTime() ?? Infinity) <= now.getTime())
    .sort((a, b) => byKey.get(key(a))!.due.getTime() - byKey.get(key(b))!.due.getTime());
  const fresh = deck.filter((c) => !byKey.has(key(c)));
  return [...due, ...fresh].slice(0, size);
}

export function deckCounts(deck: DeckCard[], states: CardRecord[], now: Date) {
  const queue = buildQueue(deck, states, now, Infinity);
  const fresh = queue.filter((c) => !states.some((s) => key(s) === key(c))).length;
  return { due: queue.length - fresh, fresh };
}
