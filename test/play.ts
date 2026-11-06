import { content } from '@/content';
import type { LessonSession } from '@/lesson/session';

/** Plays the lesson, answering graded steps right unless the step id is in `wrong`. */
export function play(s: LessonSession, wrong: string[] = [], stopAt?: string) {
  while (!s.finished && s.current.type !== stopAt) {
    const q = s.question();
    const bad = wrong.includes(s.current.id);
    if (q) s.answer(bad ? (q.answer + 1) % 4 : q.answer);
    const st = s.current;
    if (st.type === 'type_answer') {
      const w = content.words[st.word];
      s.answerText(bad ? 'zzz' : st.direction === 'pt_to_jp' ? w.kana : w.translations[0]);
    }
    if (st.type === 'situation') s.answerSituation(bad ? (st.answer + 1) % st.options.length : st.answer);
    if (st.type === 'true_false') s.answerBool(bad ? !st.answer : st.answer);
    if (st.type === 'build_sentence') s.answerBlocks(bad ? [...st.blocks].reverse() : st.blocks);
    s.next();
  }
}
