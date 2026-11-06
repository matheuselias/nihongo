import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Content } from '@/content/load';
import { useTheme } from '@/hooks/use-theme';
import { pathX } from '@/trail/layout';
import { lessonStates, newWordIds, nextLessonId, reviewPoints } from '@/trail/rules';

const NODE = 64;
const REVIEW = 84;
const ROW = 124;
const HEADER = 112;
const MARGIN = 24;
const BUBBLE_W = 240;
const KANJI = '一二三四五六七八九十';

type Item =
  | { kind: 'lesson'; id: string; title: string; n: number }
  | { kind: 'review'; id: string; active: boolean };

type Props = { content: Content; scores: Map<string, number>; completed: Set<string>; reviewsDone: string[] };

export function TrailPath({ content, scores, completed, reviewsDone }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(Math.min(Dimensions.get('window').width, MaxContentWidth));
  const [open, setOpen] = useState<string>();
  const states = lessonStates(content, completed);
  const next = nextLessonId(content, completed);
  const points = reviewPoints(content, completed);

  // Absolute layout: every node, line and header gets a computed position so the bubble can anchor to a node.
  const out: React.ReactNode[] = [];
  const lines: React.ReactNode[] = []; // drawn first so nodes and titles sit on top
  let y = 0;
  let bubble: React.ReactNode;
  content.sections.forEach((section, si) => {
    out.push(
      <View key={section.id} style={[styles.header, { top: y, backgroundColor: theme.primary }]}>
        <ThemedText numberOfLines={1} style={{ color: theme.onPrimary, fontSize: 20, lineHeight: 26, fontWeight: 700 }}>{`${KANJI[si] ?? si + 1} · ${section.title}`}</ThemedText>
        <ThemedText type="small" numberOfLines={2} style={{ color: theme.onPrimary }}>{section.description}</ThemedText>
      </View>,
    );
    y += HEADER;
    const items: Item[] = section.lessons.map((l, i) => ({ kind: 'lesson', id: l.id, title: l.title, n: i + 1 }));
    points.filter((p) => p.afterSectionId === section.id).forEach((p) => items.push({ kind: 'review', id: p.id, active: p.active }));
    let prev: { x: number; y: number } | undefined;
    items.forEach((item, i) => {
      const review = item.kind === 'review';
      const size = review ? REVIEW : NODE;
      const x = review ? width / 2 : pathX(i, width, NODE, MARGIN);
      const cy = y + ROW * i + size / 2 + 8;
      if (prev) lines.push(<Line key={`l-${item.id}`} from={prev} to={{ x, y: cy }} color={theme.border} />);
      prev = { x, y: cy };
      const left = x - size / 2;
      const top = cy - size / 2;
      if (item.kind === 'review') {
        const done = reviewsDone.includes(item.id);
        out.push(
          <Link key={item.id} href={{ pathname: '/review-session', params: { point: item.id } }} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Revisão, ${done ? 'concluída' : item.active ? 'ativa' : 'apagada'}`}
              style={StyleSheet.flatten([styles.node, styles.reviewNode, { left, top, width: size, height: size, backgroundColor: item.active ? theme.accent : theme.backgroundSelected, borderColor: item.active ? theme.accentDark : theme.border, opacity: item.active ? 1 : 0.6 }])}>
              <ThemedText style={[styles.nodeText, { color: item.active ? theme.onAccent : theme.primaryText }]}>{done ? '✓' : '復'}</ThemedText>
            </Pressable>
          </Link>,
        );
        return;
      }
      const done = states[item.id] === 'completed';
      const recommended = item.id === next;
      const score = scores.get(item.id);
      const status = done ? `concluída, ${score}%` : recommended ? 'recomendada' : 'não iniciada';
      const fill = done ? theme.primary : recommended ? theme.accent : theme.backgroundSelected;
      const textColor = done ? theme.onPrimary : recommended ? theme.onAccent : theme.primaryText;
      out.push(
        <Pulse key={item.id} on={recommended} style={{ position: 'absolute', left, top }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lição ${item.n}: ${item.title}, ${status}`}
            accessibilityState={{ selected: recommended }}
            onPress={() => setOpen(item.id)}
            style={[styles.node, { width: size, height: size, backgroundColor: fill, borderColor: done ? theme.primaryDark : recommended ? theme.accentDark : theme.primaryText }]}>
            <ThemedText style={[styles.nodeText, { color: textColor }]}>{done ? '✓' : item.n}</ThemedText>
            {done && <ThemedText style={[styles.score, { color: textColor }]}>{score}%</ThemedText>}
          </Pressable>
        </Pulse>,
        <View key={`t-${item.id}`} pointerEvents="none" style={[styles.titleBox, { left: x - 56, top: top + size + 6 }]}>
          <ThemedText type="small" numberOfLines={1} style={{ backgroundColor: theme.background, paddingHorizontal: 4 }}>{item.title}</ThemedText>
        </View>,
      );
      if (open === item.id) {
        const words = newWordIds(content, item.id).length;
        bubble = (
          <View
            key="bubble"
            style={[styles.bubble, { left: Math.max(8, Math.min(x - BUBBLE_W / 2, width - BUBBLE_W - 8)), top: top + size + 32, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText style={{ fontWeight: 600 }}>{item.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{words === 1 ? '1 palavra nova' : `${words} palavras novas`}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{done ? `Concluída · ${score}%` : 'Não iniciada'}</ThemedText>
            <Link href={{ pathname: '/lesson/[id]', params: { id: item.id } }} asChild>
              <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.start, { backgroundColor: theme.primary }])}>
                <ThemedText style={{ color: theme.onPrimary, fontWeight: 600 }}>{done ? 'Refazer' : 'Começar'}</ThemedText>
              </Pressable>
            </Link>
          </View>
        );
      }
    });
    y += ROW * items.length + 16;
  });

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: y + 160, width: '100%' }}>
      {lines}
      {out}
      {bubble && <Pressable accessibilityLabel="Fechar prévia" style={StyleSheet.absoluteFill} onPress={() => setOpen(undefined)} />}
      {bubble}
    </View>
  );
}

function Line({ from, to, color }: { from: { x: number; y: number }; to: { x: number; y: number }; color: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  return (
    <View
      style={{ position: 'absolute', height: 6, borderRadius: 3, backgroundColor: color, width: len, left: (from.x + to.x) / 2 - len / 2, top: (from.y + to.y) / 2 - 3, transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }] }}
    />
  );
}

function Pulse({ on, style, children }: { on: boolean; style: object; children: React.ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, scale]);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  header: { position: 'absolute', left: 0, right: 0, height: HEADER - 12, borderRadius: Spacing.three, padding: Spacing.three, justifyContent: 'center', gap: Spacing.half },
  node: { borderRadius: NODE / 2, borderWidth: 2, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center' },
  reviewNode: { position: 'absolute', borderRadius: 24 },
  nodeText: { fontSize: 24, fontWeight: 700, lineHeight: 28 },
  score: { fontSize: 11, lineHeight: 13, fontWeight: 600 },
  titleBox: { position: 'absolute', width: 112, alignItems: 'center' },
  bubble: { position: 'absolute', width: BUBBLE_W, padding: Spacing.three, gap: Spacing.one, borderRadius: Spacing.three, borderWidth: 1 },
  start: { marginTop: Spacing.two, paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
});
