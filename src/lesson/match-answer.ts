import type { Word } from '@/content/schema';

/** Lowercase, ō = ou, no accents, no spaces or punctuation. */
const norm = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/ō/g, 'ou')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s\p{P}\p{S}]/gu, '');

/** PT to JP takes kana, kanji or romaji; JP to PT takes a translation. `accepted` adds variants. No "almost right". */
export function matchAnswer(word: Word, direction: 'jp_to_pt' | 'pt_to_jp', input: string, accepted: string[] = []): boolean {
  const own = direction === 'pt_to_jp' ? [word.kana, word.romaji, ...(word.kanji ? [word.kanji] : [])] : word.translations;
  const given = norm(input);
  return given !== '' && [...own, ...accepted].some((a) => norm(a) === given);
}
