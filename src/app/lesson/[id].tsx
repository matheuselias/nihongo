import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ExplanatoryStep } from '@/components/lesson-step';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { content } from '@/content';
import type { Word } from '@/content/schema';
import { progressRepository } from '@/db/client';
import { LessonSession, type LessonResult } from '@/lesson/session';

const label = (w: Word, dir: 'jp_to_pt' | 'pt_to_jp') =>
  dir === 'jp_to_pt' ? w.translations[0] : `${w.kanji ?? w.kana} (${w.romaji})`;

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!content.lessons[id]) return <EmptyState title="Lição não encontrada" message="Volte e escolha outra lição." />;
  return <Player lessonId={id} />;
}

function Player({ lessonId }: { lessonId: string }) {
  const insets = useSafeAreaInsets();
  const lesson = content.lessons[lessonId];
  const [session, setSession] = useState(() => new LessonSession(content, lessonId));
  const [, rerender] = useState(0);
  const [picked, setPicked] = useState<number>();
  const [result, setResult] = useState<LessonResult>();
  const saving = useRef(false);

  const confirmExit = () => {
    if (result) return router.back();
    Alert.alert('Sair da lição?', 'Seu progresso nesta lição será perdido.', [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (confirmExit(), true));
    return () => sub.remove();
  });

  const advance = async () => {
    if (saving.current) return;
    session.next();
    setPicked(undefined);
    if (session.finished) {
      saving.current = true;
      try {
        setResult(await session.finish(progressRepository));
      } finally {
        saving.current = false;
      }
    } else rerender((n) => n + 1);
  };

  const retry = () => {
    setSession(new LessonSession(content, lessonId));
    setResult(undefined);
  };

  const q = result ? undefined : session.question();
  const step = session.current;
  const progress = (result ? session.steps.length : session.position) / session.steps.length;

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three }]}>
      <ThemedView style={styles.header}>
        <Pressable onPress={confirmExit} accessibilityRole="button" accessibilityLabel="Sair da lição" hitSlop={12}>
          <ThemedText type="subtitle">✕</ThemedText>
        </Pressable>
        <ThemedView type="backgroundSelected" style={styles.bar}>
          <ThemedView style={[styles.fill, { width: `${progress * 100}%` }]} />
        </ThemedView>
      </ThemedView>

      {result ? (
        <ThemedView style={styles.body}>
          <EmptyState
            title={result.passed ? 'Lição concluída!' : 'Quase lá'}
            message={`Nota: ${result.score}%${result.passed ? '' : ` (mínimo ${session.passScore}%). Tente de novo do início.`}`}
          />
          <Button text={result.passed ? 'Voltar à trilha' : 'Tentar de novo'} onPress={result.passed ? () => router.back() : retry} />
          {!result.passed && <Button text="Sair" onPress={() => router.back()} secondary />}
        </ThemedView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="smallBold" themeColor="textSecondary">{lesson.title}</ThemedText>
            {q ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {q.direction === 'jp_to_pt' ? 'O que significa?' : 'Como se diz em japonês?'}
                </ThemedText>
                <ThemedText type="subtitle">
                  {q.direction === 'jp_to_pt'
                    ? `${q.prompt.kanji ?? q.prompt.kana} (${q.prompt.romaji})`
                    : `${q.prompt.translations[0]}${q.prompt.hint ? ` (${q.prompt.hint})` : ''}`}
                </ThemedText>
                {q.options.map((o, i) => {
                  const answered = session.answered() !== undefined;
                  const state = !answered ? undefined : i === q.answer ? styles.right : i === picked ? styles.wrong : undefined;
                  return (
                    <Pressable
                      key={o.id}
                      disabled={answered}
                      accessibilityRole="button"
                      onPress={() => {
                        session.answer(i);
                        setPicked(i);
                      }}>
                      <ThemedView type="backgroundElement" style={[styles.option, state]}>
                        <ThemedText>{label(o, q.direction)}</ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
                {session.answered() !== undefined && (
                  <ThemedText type="smallBold">
                    {session.answered() ? 'Correto!' : `Resposta certa: ${label(q.options[q.answer], q.direction)}`}
                  </ThemedText>
                )}
              </>
            ) : (
              <ExplanatoryStep step={step} />
            )}
          </ScrollView>
          {(!q || session.answered() !== undefined) && <Button text="Continuar" onPress={advance} />}
        </>
      )}
    </ThemedView>
  );
}

function Button({ text, onPress, secondary }: { text: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.button, secondary && styles.secondary]}>
      <ThemedText style={secondary ? undefined : styles.buttonText}>{text}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#3c87f7' },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  content: { gap: Spacing.three, paddingVertical: Spacing.four },
  option: { padding: Spacing.three, borderRadius: Spacing.three, borderWidth: 2, borderColor: 'transparent' },
  right: { borderColor: '#2e9d57' },
  wrong: { borderColor: '#d64545' },
  button: { backgroundColor: '#3c87f7', padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  secondary: { backgroundColor: 'transparent' },
  buttonText: { color: '#fff', fontWeight: 600 },
});
