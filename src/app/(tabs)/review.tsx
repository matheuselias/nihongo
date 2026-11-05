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
  useFocusEffect(
    useCallback(() => {
      validMistakes(progressRepository, content).then((m) => setCount(m.length));
    }, []),
  );
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
  cards: { margin: Spacing.three, marginBottom: 100, padding: Spacing.three, borderRadius: Spacing.three, opacity: 0.6 },
  cardsTitle: { fontWeight: 600 },
});
