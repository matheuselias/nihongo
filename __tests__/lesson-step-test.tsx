import { render, screen } from '@testing-library/react-native';

import { ExplanatoryStep, WordCard } from '@/components/lesson-step';
import { content } from '@/content';

const w = content.words['ohayou-gozaimasu'];

describe('WordCard', () => {
  test('shows kana, romaji, translations with hint and note', async () => {
    await render(<WordCard word={w} />);
    screen.getByText(w.kana);
    screen.getByText(w.romaji);
    screen.getByText('bom dia (formal)');
    screen.getByText(w.note!);
  });

  test('shows kanji only when the word has one', async () => {
    const yasumi = content.words['yasumi'];
    await render(<WordCard word={yasumi} />);
    screen.getByText('休み');
    await screen.unmount();
    await render(<WordCard word={w} />);
    expect(screen.queryByText('休み')).toBeNull();
  });
});

describe('ExplanatoryStep', () => {
  test('present renders the word card', async () => {
    await render(<ExplanatoryStep step={{ id: 's1', type: 'present', word: 'ohayou-gozaimasu' }} />);
    screen.getByText(w.kana);
  });

  test('rule renders title, body and example words', async () => {
    await render(<ExplanatoryStep step={{ id: 's1', type: 'rule', title: 'Título', body: 'Corpo', words: ['ohayou'] }} />);
    screen.getByText('Título');
    screen.getByText('Corpo');
    screen.getByText('おはよう');
  });

  test('examples render optional title and literal translation', async () => {
    await render(
      <ExplanatoryStep step={{ id: 's1', type: 'examples', title: 'Quem diz', items: [{ jp: 'おはよう！', romaji: 'Ohayou!', pt: 'Bom dia!', literal: 'cedo' }] }} />,
    );
    screen.getByText('Quem diz');
    screen.getByText('おはよう！');
    screen.getByText('Literal: cedo');
  });

  test('dialogue renders each line with its speaker', async () => {
    await render(
      <ExplanatoryStep
        step={{ id: 's1', type: 'dialogue', lines: [{ speaker: 'A', jp: 'こんにちは', romaji: 'Konnichiwa', pt: 'Olá' }, { speaker: 'B', jp: 'どうも', romaji: 'Doumo', pt: 'Oi' }] }}
      />,
    );
    screen.getByText('A');
    screen.getByText('B');
    screen.getByText('Oi');
  });

  test('graded steps render nothing', async () => {
    await render(<ExplanatoryStep step={{ id: 's1', type: 'true_false', statement: 'x', answer: true, explanation: 'y' }} />);
    expect(screen.queryByText('x')).toBeNull();
  });
});
