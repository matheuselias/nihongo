import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Player } from '@/components/lesson-player';
import { content } from '@/content';
import { progressRepository } from '@/db/client';
import type { MistakeKey } from '@/db/progress-repository';
import { sectionQuestions } from '@/lesson/free-review';
import { validMistakes } from '@/lesson/mistakes';

export default function ReviewSessionScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
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
