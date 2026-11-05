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
