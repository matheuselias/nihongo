import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { content } from '@/content';
import { progressRepository } from '@/db/client';
import { useTheme } from '@/hooks/use-theme';
import { deckCards, deckCounts } from '@/lesson/deck';
import { validMistakes } from '@/lesson/mistakes';

export default function ReviewScreen() {
  const theme = useTheme();
  const [count, setCount] = useState<number>();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<Awaited<ReturnType<typeof progressRepository.getCardStates>>>([]);
  useFocusEffect(
    useCallback(() => {
      validMistakes(progressRepository, content).then((m) => setCount(m.length));
      progressRepository.getCardStates().then(setCards);
      progressRepository.getAll().then((p) => setDone(new Set(p.filter((x) => x.completed).map((x) => x.lessonId))));
    }, []),
  );
  const completed = content.sections.filter((s) => s.lessons.every((l) => done.has(l.id)));
  if (count === undefined) return null;
  const deck = deckCards(content, done);
  const { due, fresh } = deckCounts(deck, cards, new Date());

  return (
    <ThemedView style={styles.screen}>
      {count ? (
        <ThemedView style={styles.center}>
          <ThemedText type="subtitle">Meus erros</ThemedText>
          <ThemedText themeColor="textSecondary">
            {count} {count === 1 ? 'erro pendente' : 'erros pendentes'}
          </ThemedText>
          <Link href="/review-session" asChild>
            <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.button, { backgroundColor: theme.primary }])}>
              <ThemedText style={[styles.buttonText, { color: theme.onPrimary }]}>Reforçar ({count})</ThemedText>
            </Pressable>
          </Link>
        </ThemedView>
      ) : (
        <EmptyState title="Sem erros pendentes" message="Os exercícios que você errar nas lições aparecem aqui para reforçar." />
      )}
      <ThemedView style={styles.practice}>
        <ThemedText style={styles.cardsTitle}>Praticar uma seção</ThemedText>
        {completed.length ? (
          completed.map((sec) => (
            <Link key={sec.id} href={{ pathname: '/review-session', params: { section: sec.id } }} asChild>
              <Pressable accessibilityRole="button">
                <ThemedView type="backgroundElement" style={styles.section}>
                  <ThemedText>{sec.title}</ThemedText>
                </ThemedView>
              </Pressable>
            </Link>
          ))
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Conclua todas as lições de uma seção para praticar as palavras dela aqui.
          </ThemedText>
        )}
      </ThemedView>
      <ThemedView type="backgroundElement" style={styles.cards}>
        <ThemedText style={styles.cardsTitle}>Cards</ThemedText>
        {!deck.length ? (
          <ThemedText type="small" themeColor="textSecondary">
            As palavras entram no baralho quando você conclui lições.
          </ThemedText>
        ) : !due && !fresh ? (
          <ThemedText type="small" themeColor="textSecondary">Você está em dia!</ThemedText>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">{due} para revisar</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{fresh} {fresh === 1 ? 'novo' : 'novos'}</ThemedText>
            <Link href="/card-session" asChild>
              <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.button, { backgroundColor: theme.primary }])}>
                <ThemedText style={[styles.buttonText, { color: theme.onPrimary }]}>Estudar</ThemedText>
              </Pressable>
            </Link>
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  button: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: Spacing.three },
  buttonText: { fontWeight: 600 },
  practice: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  section: { padding: Spacing.three, borderRadius: Spacing.three },
  cards: { margin: Spacing.three, marginBottom: 100, padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, alignItems: 'flex-start' },
  cardsTitle: { fontWeight: 600 },
});
