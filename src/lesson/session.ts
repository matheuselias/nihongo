import type { Content } from '@/content/load';
import { GRADED_TYPES, type Step, type Word } from '@/content/schema';
import type { MistakeKey, ProgressRepository } from '@/db/progress-repository';
import { matchAnswer } from '@/lesson/match-answer';

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
export function sectionWordIds(content: Content, lessonId: string): string[] {
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

/** One run through a lesson. Graded steps are answered once. */
export class LessonSession {
  readonly steps: Step[];
  readonly passScore: number;
  private index = 0;
  private questions = new Map<string, ChoiceQuestion>();
  private typed = new Map<string, Extract<Step, { type: 'type_answer' }>>();
  private answers = new Map<string, boolean>();
  private shuffled = new Map<string, string[]>();
  private lessonOf = new Map<string, string>();

  /** With `picks`, replays those graded steps (Reforço); their ids become `lessonId/stepId` to stay unique. */
  constructor(
    private content: Content,
    readonly lessonId: string,
    private rng: Rng = Math.random,
    readonly picks?: MistakeKey[],
    /** Ready-made steps (free review); nothing is saved. */
    private custom?: Step[],
  ) {
    const lesson = content.lessons[lessonId];
    this.passScore = lesson.pass_score;
    this.steps = custom
      ? custom
      : picks
      ? picks.map((p) => ({ ...content.lessons[p.lessonId].steps.find((s) => s.id === p.stepId)!, id: `${p.lessonId}/${p.stepId}` }))
      : lesson.steps;
    picks?.forEach((p) => this.lessonOf.set(`${p.lessonId}/${p.stepId}`, p.lessonId));
    for (const s of this.steps) {
      const lid = this.lessonOf.get(s.id) ?? lessonId;
      if (s.type === 'multiple_choice') this.questions.set(s.id, buildChoice(s, content, lid, rng));
      if (s.type === 'type_answer') this.typed.set(s.id, s);
      if (s.type === 'build_sentence') this.shuffled.set(s.id, shuffle(s.blocks, rng));
    }
  }

  /** Reforço sessions have no score and never pass or fail a lesson. */
  get review() {
    return !!(this.picks || this.custom);
  }

  /** Lesson the current step came from. */
  get currentLessonId() {
    return this.lessonOf.get(this.current.id) ?? this.lessonId;
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

  /** Grades typed text for the current type_answer step. A second answer to the same step is ignored. */
  answerText(text: string): boolean {
    const step = this.typed.get(this.current.id);
    if (!step) throw new Error('current step is not a type_answer');
    const prev = this.answers.get(step.id);
    if (prev !== undefined) return prev;
    const right = matchAnswer(this.content.words[step.word], step.direction, text, step.accepted);
    this.answers.set(step.id, right);
    return right;
  }

  private record(right: boolean): boolean {
    const prev = this.answers.get(this.current.id);
    if (prev !== undefined) return prev;
    this.answers.set(this.current.id, right);
    return right;
  }

  /** Picks an option of the current situation step. A second answer is ignored. */
  answerSituation(choice: number): boolean {
    const step = this.current;
    if (step.type !== 'situation') throw new Error('current step is not a situation');
    return this.record(choice === step.answer);
  }

  answerBool(value: boolean): boolean {
    const step = this.current;
    if (step.type !== 'true_false') throw new Error('current step is not a true_false');
    return this.record(value === step.answer);
  }

  /** The blocks of the current build_sentence step in the order shown to the person. */
  blocks(): string[] {
    const b = this.shuffled.get(this.current.id);
    if (!b) throw new Error('current step is not a build_sentence');
    return b;
  }

  /** `placed` is the blocks' text in the order the person put them. */
  answerBlocks(placed: string[]): boolean {
    const step = this.current;
    if (step.type !== 'build_sentence') throw new Error('current step is not a build_sentence');
    return this.record(placed.join('\n') === step.blocks.join('\n'));
  }

  /** Moves on. A graded step must be answered first. */
  next() {
    if (GRADED_TYPES.includes(this.current.type) && this.answered() === undefined) throw new Error('answer first');
    this.index++;
  }

  result(): LessonResult {
    const graded = this.steps.filter((s) => GRADED_TYPES.includes(s.type)).map((s) => s.id);
    const wrongStepIds = graded.filter((id) => !this.answers.get(id));
    const score = Math.round((100 * (graded.length - wrongStepIds.length)) / graded.length);
    return { score, passed: score >= this.passScore, wrongStepIds };
  }

  /** Records the wrong steps always, and the score only on a pass; leaving early never gets here. */
  async finish(repo: ProgressRepository, now = new Date()): Promise<LessonResult> {
    const r = this.result();
    if (this.custom) return r;
    if (this.picks) {
      // Reforço: right clears the mistake, wrong keeps it.
      for (const p of this.picks) {
        if (!r.wrongStepIds.includes(`${p.lessonId}/${p.stepId}`)) await repo.clearMistake(p.lessonId, p.stepId);
      }
      return r;
    }
    const wordOf = (id: string) => {
      const s = this.steps.find((x) => x.id === id);
      return s && 'word' in s ? s.word : undefined;
    };
    await repo.recordMistakes(this.lessonId, r.wrongStepIds.map((stepId) => ({ stepId, wordId: wordOf(stepId) })));
    if (r.passed) {
      await repo.recordResult(this.lessonId, r.score, true, now);
      await repo.recordStudyDay(now);
    }
    return r;
  }
}
