import type { Content } from '@/content/load';

export type LessonState = 'locked' | 'available' | 'completed';

/** Lessons run in one linear order across sections: a lesson opens once every earlier one is completed. */
export function lessonStates(content: Content, completed: ReadonlySet<string>): Record<string, LessonState> {
  const states: Record<string, LessonState> = {};
  let open = true;
  for (const section of content.sections)
    for (const { id } of section.lessons) {
      if (completed.has(id)) states[id] = 'completed';
      else {
        states[id] = open ? 'available' : 'locked';
        open = false;
      }
    }
  return states;
}

export type ReviewPoint = { id: string; afterSectionId: string; sectionIds: [string, string] };

/** Review point N shows after section 2N, once that section is completed. It never gates a lesson. */
export function reviewPoints(content: Content, completed: ReadonlySet<string>): ReviewPoint[] {
  const points: ReviewPoint[] = [];
  for (let n = 1; 2 * n <= content.sections.length; n++) {
    const [a, b] = content.sections.slice(2 * n - 2, 2 * n);
    if (b.lessons.every((l) => completed.has(l.id)))
      points.push({ id: `review-${n}`, afterSectionId: b.id, sectionIds: [a.id, b.id] });
  }
  return points;
}
