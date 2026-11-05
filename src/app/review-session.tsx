import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Player } from '@/components/lesson-player';
import { content } from '@/content';
import { progressRepository } from '@/db/client';
import { validMistakes } from '@/lesson/mistakes';
import type { MistakeKey } from '@/db/progress-repository';

export default function ReviewSessionScreen() {
  const [picks, setPicks] = useState<MistakeKey[]>();
  useEffect(() => {
    validMistakes(progressRepository, content, 10).then(setPicks);
  }, []);
  if (!picks) return null;
  if (!picks.length) return <EmptyState title="Nada para reforçar" message="Você não tem erros pendentes." />;
  return <Player lessonId={picks[0].lessonId} picks={picks} />;
}
