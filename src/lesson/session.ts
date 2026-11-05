import type { Content } from '@/content/load';
import type { Step, Word } from '@/content/schema';
import type { ProgressRepository } from '@/db/progress-repository';

export type Rng = () => number;

export type ChoiceQuestion = { prompt: Word; direction: 'jp_to_pt' | 'pt_to_jp'; options: Word[]; answer: number };

export type LessonResult = { score: number; passed: boolean; wrongStepIds: string[] };

/** Fisher-Yates on a copy. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Words the section teaches, taken from the word refs in its lessons. */
function sectionWordIds(content: Content, lessonId: string): string[] {
  const section = content.sections.find((s) => s.lessons.some((l) => l.id === lessonId));
  const ids = new Set<string>();
  for (const lesson of section?.lessons ?? [])
    for (const s of lesson.steps) {
      if (s.type === 'present' || s.type === 'multiple_choice' || s.type === 'type_answer') ids.add(s.word);
      if (s.type === 'rule') s.words?.forEach((w) => ids.add(w));
    }
  return [...ids];
}

export function buildChoice(
  step: Extract<Step, { type: 'multiple_choice' }>,
  content: Content,
  lessonId: string,
  rng: Rng,
): ChoiceQuestion {
  const word = content.words[step.word];
  let distractors: Word[];
  if (step.distractors) distractors = step.distractors.map((id) => content.words[id]);
  else {
    // Words sharing a translation with the answer would be a second correct option.
    const ok = (w: Word) => w.id !== word.id && !w.translations.some((t) => word.translations.includes(t));
    const pool = sectionWordIds(content, lessonId).map((id) => content.words[id]).filter(ok);
    // shortcut: tiny sections fall back to the whole vocabulary, fine until a section has under 4 distinct words.
    const fallback = Object.values(content.words).filter((w) => ok(w) && !pool.includes(w));
    distractors = [...shuffle(pool, rng), ...shuffle(fallback, rng)].slice(0, 3);
  }
  const options = shuffle([word, ...distractors], rng);
  return { prompt: word, direction: step.direction, options, answer: options.indexOf(word) };
}

/** One run through a lesson. Graded steps are answered once; step types not built yet are shown but never graded. */
export class LessonSession {
  readonly steps: Step[];
  readonly passScore: number;
  private index = 0;
  private questions = new Map<string, ChoiceQuestion>();
  private answers = new Map<string, boolean>();

  constructor(
    content: Content,
    readonly lessonId: string,
    private rng: Rng = Math.random,
  ) {
    const lesson = content.lessons[lessonId];
    this.steps = lesson.steps;
    this.passScore = lesson.pass_score;
    for (const s of lesson.steps) if (s.type === 'multiple_choice') this.questions.set(s.id, buildChoice(s, content, lessonId, rng));
  }

  get current(): Step {
    return this.steps[this.index];
  }
  get position() {
    return this.index;
  }
  get finished() {
    return this.index >= this.steps.length;
  }
  question(): ChoiceQuestion | undefined {
    return this.questions.get(this.current.id);
  }
  questionFor(stepId: string): ChoiceQuestion | undefined {
    return this.questions.get(stepId);
  }
  /** Result of the current graded step once answered, else undefined. */
  answered(): boolean | undefined {
    return this.answers.get(this.current.id);
  }

  /** Returns whether the choice was right. A second answer to the same step is ignored. */
  answer(choice: number): boolean {
    const q = this.question();
    if (!q) throw new Error('current step is not a multiple_choice');
    const prev = this.answers.get(this.current.id);
    if (prev !== undefined) return prev;
    const right = choice === q.answer;
    this.answers.set(this.current.id, right);
    return right;
  }

  /** Moves on. A graded step must be answered first. */
  next() {
    if (this.questions.has(this.current.id) && this.answered() === undefined) throw new Error('answer first');
    this.index++;
  }

  result(): LessonResult {
    const graded = [...this.questions.keys()];
    const wrongStepIds = graded.filter((id) => !this.answers.get(id));
    const score = Math.round((100 * (graded.length - wrongStepIds.length)) / graded.length);
    return { score, passed: score >= this.passScore, wrongStepIds };
  }

  /** Saves only a pass; leaving or failing writes nothing. */
  async finish(repo: ProgressRepository): Promise<LessonResult> {
    const r = this.result();
    if (r.passed) await repo.recordResult(this.lessonId, r.score, true);
    return r;
  }
}
