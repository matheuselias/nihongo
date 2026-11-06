---
name: create-lessons
description: Create Lessons - turn context/content.md into a new section of lesson JSONs (vocabulary, section, lessons, index.ts wiring) for the nihongo app, following context/lesson-authoring-guide.md. Use when the user asks to create lessons, add a new section, or process content.md.
---

Read `context/lesson-authoring-guide.md` and follow it exactly to turn `context/content.md` into a new section for the app.

1. Read the guide, `context/project-overview.md`, `context/content.md`, `content/index.ts`, all `content/vocabulary/*.json` (to reuse existing word ids) and the reference section `content/sections/01-greetings/`.
2. Pick the next section number and slug. Create `content/vocabulary/<section>.json`, `content/sections/NN-<section>/section.json` and one JSON per lesson (3 to 8 lessons, 6 to 12 steps each), and wire them into `content/index.ts` (vocabulary first, then the section, in order).
3. Do not teach what the source does not say. If the source lacks readings or sentences, add only what is needed and flag it in the final report. If you edit existing vocabulary (e.g. adding `kanji`), say so.
4. Validate: `npm test`, `npx tsc --noEmit`, `npx expo lint`. Fix every failure.
5. Reread the lessons against the guide's pedagogy rules, then show the user a short summary (lessons, new words, reused words, anything invented or changed) for review.
6. If a rule in the guide proved wrong or ambiguous, fix the guide.

Do not commit or push unless the user asks.
