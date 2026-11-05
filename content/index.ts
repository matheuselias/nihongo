// Wired by hand: Metro needs static requires. Add each new section's files here, in order.
import type { RawContent } from '../src/content/load';

export const rawContent: RawContent = {
  vocabulary: [require('./vocabulary/greetings.json'), require('./vocabulary/affirming-and-denying.json'),
    require('./vocabulary/self-introduction.json'), require('./vocabulary/particle-no.json'), require('./vocabulary/demonstratives.json'),
    require('./vocabulary/selves-yes-no-fillers.json'), require('./vocabulary/first-kanji.json'),
    require('./vocabulary/everyday-words.json'),
  ],
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
    {
      section: require('./sections/02-affirming-and-denying/section.json'),
      lessons: [
        require('./sections/02-affirming-and-denying/01-desu-and-wa.json'),
        require('./sections/02-affirming-and-denying/02-more-examples.json'),
        require('./sections/02-affirming-and-denying/03-casual-da.json'),
        require('./sections/02-affirming-and-denying/04-negating.json'),
      ],
    },
    {
      section: require('./sections/03-self-introduction/section.json'),
      lessons: [
        require('./sections/03-self-introduction/01-first-meeting.json'),
        require('./sections/03-self-introduction/02-formal.json'),
        require('./sections/03-self-introduction/03-age.json'),
        require('./sections/03-self-introduction/04-jobs.json'),
        require('./sections/03-self-introduction/05-company-jobs.json'),
        require('./sections/03-self-introduction/06-more-jobs.json'),
        require('./sections/03-self-introduction/07-nationalities.json'),
        require('./sections/03-self-introduction/08-where-from.json'),
      ],
    },
    {
      section: require('./sections/04-particle-no/section.json'),
      lessons: [
        require('./sections/04-particle-no/01-connecting-nouns.json'),
        require('./sections/04-particle-no/02-main-idea-last.json'),
        require('./sections/04-particle-no/03-bigger-sentences.json'),
      ],
    },
    {
      section: require('./sections/05-demonstratives/section.json'),
      lessons: [
        require('./sections/05-demonstratives/01-kore-sore-are.json'),
        require('./sections/05-demonstratives/02-dore.json'),
        require('./sections/05-demonstratives/03-kono-sono-ano.json'),
        require('./sections/05-demonstratives/04-koko-soko-asoko.json'),
      ],
    },
    {
      section: require('./sections/06-selves-yes-no-fillers/section.json'),
      lessons: [
        require('./sections/06-selves-yes-no-fillers/01-formal-selves.json'),
        require('./sections/06-selves-yes-no-fillers/02-casual-selves.json'),
        require('./sections/06-selves-yes-no-fillers/03-yes-and-no.json'),
        require('./sections/06-selves-yes-no-fillers/04-fillers.json'),
      ],
    },
    {
      section: require('./sections/07-first-kanji/section.json'),
      lessons: [
        require('./sections/07-first-kanji/01-places-things.json'),
        require('./sections/07-first-kanji/02-people.json'),
        require('./sections/07-first-kanji/03-name-and-questions.json'),
      ],
    },
    {
      section: require('./sections/08-everyday-words/section.json'),
      lessons: [
        require('./sections/08-everyday-words/01-friends.json'),
        require('./sections/08-everyday-words/02-konbini.json'),
        require('./sections/08-everyday-words/03-reactions.json'),
        require('./sections/08-everyday-words/04-family.json'),
        require('./sections/08-everyday-words/05-home.json'),
      ],
    },
  ],
};
