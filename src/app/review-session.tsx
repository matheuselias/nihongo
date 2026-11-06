import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { EmptyState } from '@/components/empty-state';
import { Player } from '@/components/lesson-player';
import { content } from '@/content';
import { progressRepository } from '@/db/client';
import type { MistakeKey } from '@/db/progress-repository';
import { sectionQuestions } from '@/lesson/free-review';
import type { Step } from '@/content/schema';
import { validMistakes } from '@/lesson/mistakes';
import { reviewQuestions, sectionWords } from '@/trail/review';
import { reviewPoints } from '@/trail/rules';

/** Trail review point: a summary of the two sections, then 8 questions. Finishing (not leaving) records it. */
function ReviewPoint({ id }: { id: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<{ sectionIds: [string, string]; steps: Step[] } | null>();
  const [started, setStarted] = useState(false);
  useEffect(() => {
    (async () => {
      const done = new Set((await progressRepository.getAll()).filter((p) => p.completed).map((p) => p.lessonId));
      const point = reviewPoints(content, done).find((p) => p.id === id);
      if (!point) return setState(null);
      const completed = content.sections.filter((s) => s.lessons.every((l) => done.has(l.id))).map((s) => s.id);
      const mistakes = new Set((await validMistakes(progressRepository, content)).flatMap((m) => (m.wordId ? [m.wordId] : [])));
      setState({ sectionIds: point.sectionIds, steps: reviewQuestions(content, completed, mistakes, Math.random) });
    })();
  }, [id]);

  if (state === undefined) return <ThemedView style={styles.loading}><ActivityIndicator size="large" accessibilityLabel="Carregando revisão" /></ThemedView>;
  if (!state?.steps.length) return <EmptyState title="Nada para revisar" message="Esta revisão não tem perguntas." />;
  if (started) return <Player lessonId={content.sections.find((s) => s.id === state.sectionIds[0])!.lessons[0].id} custom={state.steps} title="Revisão" onDone={() => progressRepository.recordReview(id)} />;
  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three }]}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Sair da revisão" hitSlop={12}>
        <ThemedText type="subtitle">✕</ThemedText>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Resumo</ThemedText>
        {state.sectionIds.map((sid) => (
          <ThemedView key={sid} style={styles.group}>
            <ThemedText style={styles.bold}>{content.sections.find((s) => s.id === sid)!.title}</ThemedText>
            {sectionWords(content, sid).map((w) => (
              <ThemedText key={w.id}>
                {w.kanji ?? w.kana} ({w.romaji}) - {w.translations.join(' / ')}
              </ThemedText>
            ))}
          </ThemedView>
        ))}
      </ScrollView>
      <Pressable onPress={() => setStarted(true)} accessibilityRole="button" style={[styles.button, { backgroundColor: theme.primary }]}>
        <ThemedText style={[styles.buttonText, { color: theme.onPrimary }]}>Começar</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export default function ReviewSessionScreen() {
  const { section, point } = useLocalSearchParams<{ section?: string; point?: string }>();
  if (point) return <ReviewPoint id={point} />;
  return <Reinforcement section={section} />;
}

function Reinforcement({ section }: { section?: string }) {
  const free = section ? content.sections.find((s) => s.id === section) : undefined;
  const [picks, setPicks] = useState<MistakeKey[]>();
  const [steps] = useState(() => (free ? sectionQuestions(content, free.id, Math.random) : undefined));
  useEffect(() => {
    if (!free) validMistakes(progressRepository, content, 10).then(setPicks);
  }, [free]);

  if (free) {
    if (!steps?.length) return <EmptyState title="Nada para praticar" message="Esta seção não tem perguntas." />;
    return <Player lessonId={free.lessons[0].id} custom={steps} title={free.title} />;
  }
  if (!picks) return null;
  if (!picks.length) return <EmptyState title="Nada para reforçar" message="Você não tem erros pendentes." />;
  return <Player lessonId={picks[0].lessonId} picks={picks} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1, paddingHorizontal: Spacing.three },
  content: { gap: Spacing.three, paddingVertical: Spacing.four },
  group: { gap: Spacing.one },
  bold: { fontWeight: 600 },
  button: { padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  buttonText: { fontWeight: 600 },
});
