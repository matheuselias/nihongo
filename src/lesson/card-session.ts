import type { Content } from '@/content/load';
import type { CardRecord, ProgressRepository } from '@/db/progress-repository';
import type { DeckCard } from '@/lesson/deck';
import { matchAnswer } from '@/lesson/match-answer';
import { schedule, type Grade } from '@/lesson/schedule';
import { shuffle, type Rng } from '@/lesson/session';

const key = (c: DeckCard) => `${c.wordId}/${c.direction}`;

/** One study run over a queue of cards. Only the first attempt of each card is scheduled and counted. */
export class CardSession {
  readonly total: number;
  private queue: DeckCard[];
  private prior: Map<string, CardRecord>;
  private seen = new Set<string>();
  private cleared = 0;
  private firstTry = 0;
  /** The cards this run started with, kept for "Repetir estes". */
  readonly cards: DeckCard[];
  private result?: boolean;
  private flipped = false;

  constructor(
    private content: Content,
    queue: DeckCard[],
    states: CardRecord[],
    private repo: ProgressRepository,
    private rng: Rng = Math.random,
    private now: () => Date = () => new Date(),
    /** Free practice: saves nothing, asks for no grade, never requeues. */
    private practice = false,
  ) {
    this.cards = [...queue];
    this.queue = practice ? shuffle(queue, rng) : [...queue];
    this.total = queue.length;
    this.prior = new Map(states.map((s) => [key(s), s]));
  }

  get current(): DeckCard | undefined {
    return this.queue[0];
  }
  get finished() {
    return !this.queue.length;
  }
  /** Cards answered right on the first attempt. */
  get firstTryRight() {
    return this.firstTry;
  }
  /** Share of cards got right at least once. */
  get progress() {
    return this.total ? this.cleared / this.total : 1;
  }
  /** undefined while the card is still waiting for an answer. */
  get outcome() {
    return this.result;
  }
  get isFlipped() {
    return this.flipped;
  }
  /** A right first attempt waits for Difícil, Bom or Fácil. */
  get needsGrade() {
    return !this.practice && this.result === true && !this.seen.has(key(this.current!));
  }
  get canContinue() {
    return this.result !== undefined && !this.needsGrade;
  }

  /** Right or wrong for the typed text. After a flip the text is checked but the outcome stays wrong. */
  async answerText(text: string): Promise<boolean> {
    const c = this.current!;
    const right = matchAnswer(this.content.words[c.wordId], c.direction, text);
    if (this.result !== undefined) return this.flipped ? right : this.result;
    this.result = right;
    if (right && !this.seen.has(key(c))) this.firstTry++;
    if (!right) await this.saveFirst('wrong', false);
    return right;
  }

  /** Shows the answer; counts as wrong. Ignored once the card has an outcome. */
  async flip() {
    if (this.result !== undefined) return;
    this.flipped = true;
    this.result = false;
    await this.saveFirst('wrong', false);
  }

  async grade(grade: Grade) {
    if (!this.needsGrade || grade === 'wrong') throw new Error('grade only after a right first attempt');
    await this.saveFirst(grade, true);
  }

  /** A wrong card goes 3 to 5 places back (fewer if the queue is shorter); a right one leaves. */
  next() {
    if (!this.canContinue) throw new Error('answer first');
    const card = this.queue.shift()!;
    if (this.result) this.cleared++;
    else if (!this.practice) this.queue.splice(Math.min(3 + Math.floor(this.rng() * 3), this.queue.length), 0, card);
    this.result = undefined;
    this.flipped = false;
  }

  private async saveFirst(grade: Grade, correct: boolean) {
    const c = this.current!;
    if (this.practice || this.seen.has(key(c))) return;
    this.seen.add(key(c));
    await this.repo.saveCardResult(c.wordId, c.direction, schedule(this.prior.get(key(c)) ?? null, grade, this.now()), correct);
  }
}
