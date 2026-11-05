import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { content } from '@/content';
import { progressRepository } from '@/db/client';
import { validMistakes } from '@/lesson/mistakes';

export default function ReviewScreen() {
  const [count, setCount] = useState<number>();
  const [done, setDone] = useState<Set<string>>(new Set());
  useFocusEffect(
    useCallback(() => {
      validMistakes(progressRepository, content).then((m) => setCount(m.length));
      progressRepository.getAll().then((p) => setDone(new Set(p.filter((x) => x.completed).map((x) => x.lessonId))));
    }, []),
  );
  const completed = content.sections.filter((s) => s.lessons.every((l) => done.has(l.id)));
  if (count === undefined) return null;

  return (
    <ThemedView style={styles.screen}>
      {count ? (
        <ThemedView style={styles.center}>
          <ThemedText type="subtitle">Meus erros</ThemedText>
          <ThemedText themeColor="textSecondary">
            {count} {count === 1 ? 'erro pendente' : 'erros pendentes'}
          </ThemedText>
          <Link href="/review-session" asChild>
            <Pressable accessibilityRole="button" style={styles.button}>
              <ThemedText style={styles.buttonText}>Reforçar ({count})</ThemedText>
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
        <ThemedText type="small" themeColor="textSecondary">Em breve</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  button: { backgroundColor: '#3c87f7', paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: Spacing.three },
  buttonText: { color: '#fff', fontWeight: 600 },
  practice: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  section: { padding: Spacing.three, borderRadius: Spacing.three },
  cards: { margin: Spacing.three, marginBottom: 100, padding: Spacing.three, borderRadius: Spacing.three, opacity: 0.6 },
  cardsTitle: { fontWeight: 600 },
});
