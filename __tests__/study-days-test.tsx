import { render, screen } from '@testing-library/react-native';

import { StudyDaysBanner } from '@/components/study-days-banner';
import { content } from '@/content';
import { localDay } from '@/db/local-day';
import { InMemoryProgressRepository } from '@/db/progress-repository';
import { LessonSession } from '@/lesson/session';
import { play } from '../test/play';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
let mockRepo: InMemoryProgressRepository;
jest.mock('@/db/client', () => ({ get progressRepository() { return mockRepo; } }));
beforeEach(() => {
  mockRepo = new InMemoryProgressRepository();
});

const [l1, l2] = content.sections[0].lessons.map((l) => l.id);
const lesson = async (id: string, now: Date, wrong = false) => {
  const s = new LessonSession(content, id, () => 0.3);
  play(s, wrong ? content.lessons[id].steps.map((x) => x.id) : []);
  await s.finish(mockRepo, now);
};
const at = (d: string) => new Date(d);

test('starts at 0 days and reads as one sentence', async () => {
  await render(<StudyDaysBanner />);
  await screen.findByLabelText('0 dias estudando');
});

test('a passed lesson counts 1 day (singular); two tasks the same day stay 1', async () => {
  await lesson(l1, at('2026-05-01T10:00:00'));
  await lesson(l2, at('2026-05-01T18:00:00'));
  await render(<StudyDaysBanner />);
  await screen.findByLabelText('1 dia estudando');
});

test('failed lesson does not count', async () => {
  await lesson(l1, at('2026-05-01T10:00:00'), true);
  await render(<StudyDaysBanner />);
  await screen.findByLabelText('0 dias estudando');
});

test('abandoned lesson does not count', async () => {
  play(new LessonSession(content, l1, () => 0.3), [], 'multiple_choice');
  await render(<StudyDaysBanner />);
  await screen.findByLabelText('0 dias estudando');
});

test('non-consecutive days add up; 23:59 and 00:01 are two days', async () => {
  await lesson(l1, at('2026-05-01T10:00:00'));
  await lesson(l1, at('2026-05-05T10:00:00'));
  await lesson(l1, at('2026-05-05T23:59:00'));
  await lesson(l1, at('2026-05-06T00:01:00'));
  await render(<StudyDaysBanner />);
  await screen.findByLabelText('3 dias estudando');
});

test('local day key uses the device time zone and the repo is idempotent', async () => {
  expect(localDay(at('2026-01-02T00:01:00'))).toBe('2026-01-02');
  await mockRepo.recordStudyDay(at('2026-01-02T00:01:00'));
  await mockRepo.recordStudyDay(at('2026-01-02T23:59:00'));
  expect(await mockRepo.countStudyDays()).toBe(1);
});

describe('Meus erros', () => {
  const mistake = async () => {
    const lesson = content.lessons[l1];
    const step = lesson.steps.find((s) => s.type === 'true_false')!;
    await mockRepo.recordMistakes(l1, [{ stepId: step.id }]);
    return { step, picks: [{ lessonId: l1, stepId: step.id }] };
  };

  test('one right answer counts the day; only wrong answers do not', async () => {
    const { step, picks } = await mistake();
    const wrong = new LessonSession(content, l1, () => 0.3, picks);
    play(wrong, [`${l1}/${step.id}`]);
    await wrong.finish(mockRepo);
    expect(await mockRepo.countStudyDays()).toBe(0);
    const right = new LessonSession(content, l1, () => 0.3, picks);
    play(right);
    await right.finish(mockRepo);
    expect(await mockRepo.countStudyDays()).toBe(1);
  });

  test('a lesson and a reinforcement the same day stay 1 day', async () => {
    const { picks } = await mistake();
    await lesson(l1, at('2026-05-01T10:00:00'));
    const s = new LessonSession(content, l1, () => 0.3, picks);
    play(s);
    await s.finish(mockRepo, at('2026-05-01T20:00:00'));
    expect(await mockRepo.countStudyDays()).toBe(1);
  });
});
