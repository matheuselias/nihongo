import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { content } from '@/content';
import { progressRepository } from '@/db/client';
import { useTheme } from '@/hooks/use-theme';
import { CardSession } from '@/lesson/card-session';
import { buildQueue, deckCards } from '@/lesson/deck';
import type { Grade } from '@/lesson/schedule';

const GRADES: { grade: Grade; text: string }[] = [
  { grade: 'hard', text: 'Difícil' },
  { grade: 'good', text: 'Bom' },
  { grade: 'easy', text: 'Fácil' },
];

async function newSession() {
  const done = new Set((await progressRepository.getAll()).filter((p) => p.completed).map((p) => p.lessonId));
  const states = await progressRepository.getCardStates();
  return new CardSession(content, buildQueue(deckCards(content, done), states, new Date()), states, progressRepository);
}

export default function CardSessionScreen() {
  const [session, setSession] = useState<CardSession>();
  const [practice, setPractice] = useState<CardSession>();
  const [run, setRun] = useState(0);
  useEffect(() => {
    newSession().then(setSession);
  }, []);
  if (!session) return null;
  const next = async () => {
    setSession(await newSession());
    setRun((n) => n + 1);
  };
  const repeat = () => {
    setPractice(new CardSession(content, session.cards, [], progressRepository, Math.random, () => new Date(), true));
    setRun((n) => n + 1);
  };
  if (practice) return <Study key={run} session={practice} onDone={() => { setPractice(undefined); setRun((n) => n + 1); }} />;
  return <Study key={run} session={session} onRepeat={repeat} onNext={next} />;
}

function Study({ session, onDone, onRepeat, onNext }: { session: CardSession; onDone?: () => void; onRepeat?: () => void; onNext?: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [, rerender] = useState(0);
  const [text, setText] = useState('');
  const [locked, setLocked] = useState(false);
  const [typedRight, setTypedRight] = useState<boolean>();
  const refresh = () => rerender((n) => n + 1);

  const card = session.current;
  const word = card && content.words[card.wordId];
  const jp = word && `${word.kanji ?? word.kana} (${word.romaji})`;
  const outcome = session.outcome;
  // The field turns green or red once checked; after a flip it shows only what was typed.
  const shown = session.isFlipped ? typedRight : outcome;

  const check = async () => {
    if (!text.trim() || locked) return;
    setLocked(true);
    setTypedRight(await session.answerText(text));
    refresh();
  };
  const advance = () => {
    session.next();
    if (session.finished && onDone) return onDone();
    setText('');
    setLocked(false);
    setTypedRight(undefined);
    refresh();
  };

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.three }]}>
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Sair dos cards" hitSlop={12}>
          <ThemedText type="subtitle">✕</ThemedText>
        </Pressable>
        <ThemedView type="backgroundSelected" style={styles.bar}>
          <ThemedView style={[styles.fill, { width: `${session.progress * 100}%` }]} />
        </ThemedView>
      </ThemedView>

      {!card || !word ? (
        <ThemedView style={styles.body}>
          {session.total ? (
            <>
              <EmptyState title="Sessão concluída!" message={`${session.firstTryRight} de ${session.total} de primeira`} />
              <Button text={`Repetir estes ${session.total}`} secondary onPress={onRepeat!} />
              <Button text="Próximos 20" onPress={onNext!} />
            </>
          ) : (
            <EmptyState title="Nada para estudar" message="Você está em dia." />
          )}
          <Button text="Sair" secondary={!!session.total} onPress={() => router.back()} />
        </ThemedView>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="small" themeColor="textSecondary">
              {card.direction === 'jp_to_pt' ? 'O que significa?' : 'Como se diz em japonês?'}
            </ThemedText>
            <ThemedText type="subtitle">
              {card.direction === 'jp_to_pt' ? jp : `${word.translations[0]}${word.hint ? ` (${word.hint})` : ''}`}
            </ThemedText>
            <TextInput
              value={text}
              onChangeText={setText}
              editable={!locked}
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="off"
              returnKeyType="done"
              onSubmitEditing={check}
              accessibilityLabel="Sua resposta"
              placeholder="Digite sua resposta"
              placeholderTextColor="#888"
              style={[styles.input, { color: theme.text }, shown !== undefined && (shown ? styles.right : styles.wrong)]}
            />
            {outcome === true && <ThemedText type="smallBold">Correto!</ThemedText>}
            {outcome === false && (
              <ThemedText type="smallBold">
                Resposta certa: {card.direction === 'jp_to_pt' ? word.translations.join(' / ') : jp}
              </ThemedText>
            )}
          </ScrollView>
          {outcome === undefined && (
            <>
              <Button text="Conferir" disabled={!text.trim()} onPress={check} />
              <Button text="Ver resposta" secondary onPress={async () => (await session.flip(), refresh())} />
            </>
          )}
          {session.needsGrade && (
            <ThemedView style={styles.grades}>
              {GRADES.map((g) => (
                <ThemedView key={g.grade} style={styles.flex}>
                  <Button
                    text={g.text}
                    secondary={g.grade !== 'good'}
                    onPress={async () => {
                      await session.grade(g.grade);
                      advance();
                    }}
                  />
                </ThemedView>
              ))}
            </ThemedView>
          )}
          {session.canContinue && <Button text="Continuar" onPress={advance} />}
        </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

function Button({ text, onPress, secondary, disabled }: { text: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}>
      <ThemedText style={secondary ? undefined : styles.buttonText}>{text}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#3c87f7' },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  content: { gap: Spacing.three, paddingVertical: Spacing.four },
  input: { padding: Spacing.three, borderRadius: Spacing.three, borderWidth: 2, borderColor: '#888', fontSize: 20 },
  right: { borderColor: '#2e9d57' },
  wrong: { borderColor: '#d64545' },
  grades: { flexDirection: 'row', gap: Spacing.two },
  disabled: { opacity: 0.4 },
  button: { backgroundColor: '#3c87f7', padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  secondary: { backgroundColor: 'transparent' },
  buttonText: { color: '#fff', fontWeight: 600 },
});
