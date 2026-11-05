// Wired by hand: Metro needs static requires. Add each new section's files here, in order.
import type { RawContent } from '../src/content/load';

export const rawContent: RawContent = {
  vocabulary: [require('./vocabulary/greetings.json')],
  sections: [
    {
      section: require('./sections/01-greetings/section.json'),
      lessons: [
        require('./sections/01-greetings/01-good-morning.json'),
        require('./sections/01-greetings/02-afternoon-and-evening.json'),
        require('./sections/01-greetings/03-good-night.json'),
        require('./sections/01-greetings/04-how-are-you.json'),
      ],
    },
  ],
};
