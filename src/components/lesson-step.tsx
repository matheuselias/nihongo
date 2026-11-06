import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { content } from '@/content';
import type { Step, Word } from '@/content/schema';

export function WordCard({ word }: { word: Word }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.jp} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {word.kana}
      </ThemedText>
      {word.kanji && <ThemedText type="subtitle">{word.kanji}</ThemedText>}
      <ThemedText themeColor="textSecondary">{word.romaji}</ThemedText>
      <ThemedText>
        {word.translations.join(', ')}
        {word.hint ? ` (${word.hint})` : ''}
      </ThemedText>
      {word.note && <ThemedText type="small" themeColor="textSecondary">{word.note}</ThemedText>}
    </ThemedView>
  );
}

function Line({ jp, romaji, pt, extra }: { jp: string; romaji: string; pt: string; extra?: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {extra && <ThemedText type="smallBold" themeColor="textSecondary">{extra}</ThemedText>}
      <ThemedText type="subtitle" style={styles.line}>{jp}</ThemedText>
      <ThemedText themeColor="textSecondary">{romaji}</ThemedText>
      <ThemedText>{pt}</ThemedText>
    </ThemedView>
  );
}

/** Ungraded steps. Graded ones are rendered by the player. */
export function ExplanatoryStep({ step }: { step: Step }) {
  switch (step.type) {
    case 'present':
      return <WordCard word={content.words[step.word]} />;
    case 'rule':
      return (
        <>
          <ThemedText type="subtitle">{step.title}</ThemedText>
          <ThemedText>{step.body}</ThemedText>
          {step.words?.map((id) => <WordCard key={id} word={content.words[id]} />)}
        </>
      );
    case 'examples':
      return (
        <>
          {step.title && <ThemedText type="subtitle">{step.title}</ThemedText>}
          {step.items.map((it, i) => (
            <Line key={i} {...it} extra={it.literal && `Literal: ${it.literal}`} />
          ))}
        </>
      );
    case 'dialogue':
      return (
        <>
          {step.title && <ThemedText type="subtitle">{step.title}</ThemedText>}
          {step.lines.map((l, i) => <Line key={i} {...l} extra={l.speaker} />)}
        </>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  line: { fontSize: 28, lineHeight: 38 },
  jp: { fontSize: 40, lineHeight: 52, fontWeight: 600 },
});
