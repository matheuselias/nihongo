import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { TrailPath } from '@/components/trail-path';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { content } from '@/content';
import { progressRepository } from '@/db/client';
import type { LessonProgress } from '@/db/progress-repository';

export default function PathScreen() {
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [reviewsDone, setReviewsDone] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      progressRepository.getAll().then(setProgress);
      progressRepository.completedReviews().then(setReviewsDone);
    }, []),
  );

  const scores = new Map(progress.map((p) => [p.lessonId, p.bestScore]));
  const completed = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <TrailPath content={content} scores={scores} completed={completed} reviewsDone={reviewsDone} />
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
});
