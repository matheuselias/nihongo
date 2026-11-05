import type { Content } from '@/content/load';
import type { Step, Word } from '@/content/schema';
import { shuffle, type Rng } from '@/lesson/session';

/**
 * Auto-generated questions for a set of words: multiple_choice and type_answer, both directions.
 * Grammar pieces (generates_card false) are skipped. A multiple_choice uses whatever distractors the
 * set has (words sharing a translation excluded) and is dropped when there are none.
 */
export function generateQuestions(words: readonly Word[], rng: Rng, count = 10): Step[] {
  const pool = words.filter((w) => w.generates_card);
  const candidates: Step[] = [];
  for (const w of pool) {
    const others = pool.filter((o) => o.id !== w.id && !o.translations.some((t) => w.translations.includes(t)));
    for (const direction of ['jp_to_pt', 'pt_to_jp'] as const) {
      candidates.push({ id: '', type: 'type_answer', word: w.id, direction });
      if (others.length)
        candidates.push({
          id: '',
          type: 'multiple_choice',
          word: w.id,
          direction,
          distractors: shuffle(others, rng).slice(0, 3).map((o) => o.id),
        });
    }
  }
  return shuffle(candidates, rng)
    .slice(0, count)
    .map((s, i) => ({ ...s, id: `q${i + 1}` }));
}

export function sectionQuestions(content: Content, sectionId: string, rng: Rng): Step[] {
  const section = content.sections.find((s) => s.id === sectionId)!;
  const ids = new Set<string>();
  // shortcut: words come from present/rule/multiple_choice/type_answer refs of the section's lessons, enough while those are the only word-bearing steps.
  for (const l of section.lessons)
    for (const s of l.steps) {
      if (s.type === 'present' || s.type === 'multiple_choice' || s.type === 'type_answer') ids.add(s.word);
      if (s.type === 'rule') s.words?.forEach((w) => ids.add(w));
    }
  return generateQuestions([...ids].map((id) => content.words[id]), rng);
}
