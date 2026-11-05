import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { Player } from '@/components/lesson-player';
import { content } from '@/content';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!content.lessons[id]) return <EmptyState title="Lição não encontrada" message="Volte e escolha outra lição." />;
  return <Player lessonId={id} />;
}
