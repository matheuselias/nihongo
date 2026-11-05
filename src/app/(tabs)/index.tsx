import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { content } from '@/content';
import { progressRepository } from '@/db/client';
import type { LessonProgress } from '@/db/progress-repository';
import { lessonStates } from '@/trail/rules';

export default function PathScreen() {
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  useFocusEffect(
    useCallback(() => {
      progressRepository.getAll().then(setProgress);
    }, []),
  );

  const scores = new Map(progress.map((p) => [p.lessonId, p.bestScore]));
  const states = lessonStates(content, new Set(progress.filter((p) => p.completed).map((p) => p.lessonId)));

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {content.sections.map((section) => (
          <ThemedView key={section.id} style={styles.section}>
            <ThemedText type="subtitle">{section.title}</ThemedText>
            <ThemedText themeColor="textSecondary">{section.description}</ThemedText>
            {section.lessons.map((lesson) => {
              const state = states[lesson.id];
              const locked = state === 'locked';
              const card = (
                <ThemedView
                  type="backgroundElement"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: locked }}
                  style={[styles.card, locked && styles.locked]}>
                  <ThemedText style={styles.cardTitle}>{lesson.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {locked ? 'Bloqueada' : state === 'completed' ? `Concluída · ${scores.get(lesson.id)}%` : 'Disponível'}
                  </ThemedText>
                </ThemedView>
              );
              return locked ? (
                <ThemedView key={lesson.id}>{card}</ThemedView>
              ) : (
                <Link key={lesson.id} href={{ pathname: '/lesson/[id]', params: { id: lesson.id } }} asChild>
                  <Pressable>{card}</Pressable>
                </Link>
              );
            })}
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  section: { gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  cardTitle: { fontWeight: 600 },
  locked: { opacity: 0.5 },
});
