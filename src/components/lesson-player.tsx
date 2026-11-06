import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ExplanatoryStep } from '@/components/lesson-step';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { content } from '@/content';
import { GRADED_TYPES, type Step, type Word } from '@/content/schema';
import { useTheme } from '@/hooks/use-theme';
import { progressRepository } from '@/db/client';
import type { MistakeKey } from '@/db/progress-repository';
import { LessonSession, type LessonResult } from '@/lesson/session';

const label = (w: Word, dir: 'jp_to_pt' | 'pt_to_jp') =>
  dir === 'jp_to_pt' ? w.translations[0] : `${w.kanji ?? w.kana} (${w.romaji})`;

export function Player({ lessonId, picks, custom, title, onDone }: { lessonId: string; picks?: MistakeKey[]; custom?: Step[]; title?: string; onDone?: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
    const [session, setSession] = useState(() => new LessonSession(content, lessonId, Math.random, picks, custom));
  const [, rerender] = useState(0);
  const [picked, setPicked] = useState<number>();
  const [text, setText] = useState('');
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<LessonResult>();
  const saving = useRef(false);

  const confirmExit = () => {
    if (result) return router.back();
    Alert.alert(session.review ? 'Sair do reforço?' : 'Sair da lição?', session.review ? 'Os acertos desta sessão serão perdidos.' : 'Seu progresso nesta lição será perdido.', [
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
    setText('');
    setPlaced([]);
    if (session.finished) {
      saving.current = true;
      try {
        const r = await session.finish(progressRepository);
        await onDone?.();
        setResult(r);
      } finally {
        saving.current = false;
      }
    } else rerender((n) => n + 1);
  };

  const retry = () => {
    setSession(new LessonSession(content, lessonId, Math.random, picks, custom));
    setResult(undefined);
    setPlaced([]);
  };

  // Past the last step, saving is in flight and `session.current` is undefined until `result` arrives.
  if (!result && session.finished) return <ThemedView style={styles.screen} />;

  const q = result ? undefined : session.question();
  const step = session.current;
  const ta = result || step.type !== 'type_answer' ? undefined : step;
  const taWord = ta && content.words[ta.word];
  const done = !result && session.answered() !== undefined;
  const graded = !result && GRADED_TYPES.includes(step.type);
  const bs = result || step.type !== 'build_sentence' ? undefined : step;
  const bank = bs ? session.blocks() : [];
  const rerun = () => rerender((n) => n + 1);
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
            title={session.review ? (title === 'Revisão' ? 'Revisão concluída!' : 'Reforço concluído!') : result.passed ? 'Lição concluída!' : 'Quase lá'}
            message={session.review ? `Acertos: ${result.score}%.${custom ? '' : ' O que você errar fica na fila.'}` : `Nota: ${result.score}%${result.passed ? '' : ` (mínimo ${session.passScore}%). Tente de novo do início.`}`}
          />
          <Button text={session.review ? 'Voltar' : result.passed ? 'Voltar à trilha' : 'Tentar de novo'} onPress={result.passed || session.review ? () => router.back() : retry} />
          {!result.passed && !session.review && <Button text="Sair" onPress={() => router.back()} secondary />}
        </ThemedView>
      ) : (
        <>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="smallBold" themeColor="textSecondary">{title ?? content.lessons[session.currentLessonId].title}</ThemedText>
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
            ) : ta && taWord ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {ta.direction === 'jp_to_pt' ? 'O que significa?' : 'Como se diz em japonês?'}
                </ThemedText>
                <ThemedText type="subtitle">
                  {ta.direction === 'jp_to_pt'
                    ? `${taWord.kanji ?? taWord.kana} (${taWord.romaji})`
                    : `${taWord.translations[0]}${taWord.hint ? ` (${taWord.hint})` : ''}`}
                </ThemedText>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  editable={!done}
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                  autoComplete="off"
                  returnKeyType="done"
                  onSubmitEditing={() => text.trim() && !done && (session.answerText(text), rerender((n) => n + 1))}
                  accessibilityLabel="Sua resposta"
                  placeholder="Digite sua resposta"
                  placeholderTextColor="#888"
                  style={[styles.input, { color: theme.text }, done && (session.answered() ? styles.right : styles.wrong)]}
                />
                {done && (
                  <ThemedText type="smallBold">
                    {session.answered()
                      ? 'Correto!'
                      : `Resposta certa: ${ta.direction === 'jp_to_pt' ? taWord.translations.join(' / ') : `${taWord.kanji ?? taWord.kana} (${taWord.romaji})`}`}
                  </ThemedText>
                )}
              </>
            ) : step.type === 'situation' ? (
              <>
                <ThemedText type="subtitle">{step.context}</ThemedText>
                {step.options.map((o, i) => (
                  <Pressable
                    key={i}
                    disabled={done}
                    accessibilityRole="button"
                    onPress={() => (session.answerSituation(i), setPicked(i))}>
                    <ThemedView type="backgroundElement" style={[styles.option, done && (i === step.answer ? styles.right : i === picked ? styles.wrong : undefined)]}>
                      <ThemedText type="subtitle">{o.jp}</ThemedText>
                      <ThemedText themeColor="textSecondary">{o.romaji}</ThemedText>
                      {done && <ThemedText>{o.pt}</ThemedText>}
                    </ThemedView>
                  </Pressable>
                ))}
                {done && (
                  <ThemedText type="smallBold">
                    {session.answered() ? 'Correto!' : `Resposta certa: ${step.options[step.answer].jp}`} {step.explanation}
                  </ThemedText>
                )}
              </>
            ) : step.type === 'true_false' ? (
              <>
                <ThemedText type="subtitle">{step.statement}</ThemedText>
                {[true, false].map((v) => (
                  <Pressable
                    key={String(v)}
                    disabled={done}
                    accessibilityRole="button"
                    onPress={() => (session.answerBool(v), setPicked(v ? 1 : 0))}>
                    <ThemedView type="backgroundElement" style={[styles.option, done && (v === step.answer ? styles.right : picked === (v ? 1 : 0) ? styles.wrong : undefined)]}>
                      <ThemedText>{v ? 'Verdadeiro' : 'Falso'}</ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
                {done && (
                  <ThemedText type="smallBold">
                    {session.answered() ? 'Correto!' : 'Incorreto.'} {step.explanation}
                  </ThemedText>
                )}
              </>
            ) : bs ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">Monte a frase em japonês</ThemedText>
                <ThemedText type="subtitle">{bs.pt}</ThemedText>
                <ThemedView type="backgroundElement" style={[styles.tray, done && (session.answered() ? styles.right : styles.wrong)]}>
                  {placed.map((bi) => (
                    <Pressable key={bi} disabled={done} accessibilityRole="button" accessibilityLabel={`Remover ${bank[bi]}`} onPress={() => setPlaced(placed.filter((x) => x !== bi))}>
                      <ThemedView type="backgroundSelected" style={styles.block}>
                        <ThemedText>{bank[bi]}</ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                </ThemedView>
                <ThemedView style={styles.tray}>
                  {bank.map((b, bi) => (
                    <Pressable key={bi} disabled={done || placed.includes(bi)} accessibilityRole="button" onPress={() => setPlaced([...placed, bi])}>
                      <ThemedView type="backgroundElement" style={[styles.block, placed.includes(bi) && styles.disabled]}>
                        <ThemedText>{b}</ThemedText>
                      </ThemedView>
                    </Pressable>
                  ))}
                </ThemedView>
                {done && (
                  <ThemedText type="smallBold">
                    {session.answered() ? 'Correto!' : `Resposta certa: ${bs.blocks.join(' ')}`} ({bs.romaji})
                  </ThemedText>
                )}
              </>
            ) : (
              <ExplanatoryStep step={step} />
            )}
          </ScrollView>
          {ta && !done && (
            <Button
              text="Conferir"
              disabled={!text.trim()}
              onPress={() => {
                session.answerText(text);
                rerender((n) => n + 1);
              }}
            />
          )}
          {bs && !done && (
            <Button
              text="Conferir"
              disabled={placed.length !== bank.length}
              onPress={() => (session.answerBlocks(placed.map((i) => bank[i])), rerun())}
            />
          )}
          {(!graded || done) && <Button text="Continuar" onPress={advance} />}
          </KeyboardAvoidingView>
        </>
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
  input: { padding: Spacing.three, borderRadius: Spacing.three, borderWidth: 2, borderColor: '#888', fontSize: 20 },
  disabled: { opacity: 0.4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#3c87f7' },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  content: { gap: Spacing.three, paddingVertical: Spacing.four },
  option: { padding: Spacing.three, borderRadius: Spacing.three, borderWidth: 2, borderColor: 'transparent' },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, minHeight: 56, padding: Spacing.two, borderRadius: Spacing.three, borderWidth: 2, borderColor: 'transparent' },
  block: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Spacing.two },
  right: { borderColor: '#2e9d57' },
  wrong: { borderColor: '#d64545' },
  button: { backgroundColor: '#3c87f7', padding: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
  secondary: { backgroundColor: 'transparent' },
  buttonText: { color: '#fff', fontWeight: 600 },
});
