import type { Word } from '@/content/schema';
import { matchAnswer } from '@/lesson/match-answer';

const w = (o: Partial<Word>): Word => ({ id: 'x', kana: 'おはよう', romaji: 'ohayou', translations: ['bom dia'], generates_card: true, ...o });
const kanji = w({ kana: 'にほんご', kanji: '日本語', romaji: 'nihongo', translations: ['língua japonesa', 'japonês'] });

test.each([
  [w({}), 'pt_to_jp', 'おはよう', true],
  [kanji, 'pt_to_jp', '日本語', true],
  [kanji, 'pt_to_jp', 'nihongo', true],
  [kanji, 'pt_to_jp', 'NIHONGO ', true],
  [w({}), 'pt_to_jp', 'ohayō', true],
  [w({ romaji: 'ohayō' }), 'pt_to_jp', 'ohayou', true],
  [w({}), 'pt_to_jp', 'oha you', true],
  [w({}), 'pt_to_jp', 'ohayou!', true],
  [w({}), 'pt_to_jp', 'おはよ', false],
  [w({}), 'pt_to_jp', 'ohayo', false],
  [w({}), 'pt_to_jp', '日本語', false],
  [w({}), 'pt_to_jp', '', false],
  [w({}), 'pt_to_jp', '!!', false],
  [w({}), 'jp_to_pt', 'Bom dia.', true],
  [w({}), 'jp_to_pt', ' bom  dia ', true],
  [kanji, 'jp_to_pt', 'lingua japonesa', true],
  [kanji, 'jp_to_pt', 'JAPONÊS', true],
  [kanji, 'jp_to_pt', 'japones', true],
  [kanji, 'jp_to_pt', 'japão', false],
  [w({}), 'jp_to_pt', 'ohayou', false],
] as const)('%#: %j %s "%s" -> %s', (word, dir, input, expected) => {
  expect(matchAnswer(word, dir, input)).toBe(expected);
});

test('accepted adds variants', () => {
  expect(matchAnswer(w({}), 'jp_to_pt', 'bom dia!!', ['Bom-dia'])).toBe(true);
  expect(matchAnswer(w({}), 'jp_to_pt', 'oi', ['oi'])).toBe(true);
  expect(matchAnswer(w({}), 'jp_to_pt', 'oi')).toBe(false);
});
