import { router, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { content } from '@/content';

// Placeholder: ticket 05 replaces this with the lesson player.
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = content.lessons[id];
  return (
    <ThemedView style={{ flex: 1 }}>
      <EmptyState title={lesson?.title ?? 'Lição não encontrada'} message="O player da lição chega em breve." />
      <Pressable onPress={() => router.back()} style={{ padding: 24, alignItems: 'center' }}>
        <ThemedText type="linkPrimary">Voltar</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
