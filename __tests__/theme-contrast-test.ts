import { Colors } from '@/constants/theme';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('light and dark define the same keys', () => {
  expect(Object.keys(Colors.dark).sort()).toEqual(Object.keys(Colors.light).sort());
});

describe.each(['light', 'dark'] as const)('%s contrast (min 4.5:1)', (mode) => {
  const c = Colors[mode];
  test.each([
    ['text', 'background'],
    ['text', 'backgroundElement'],
    ['text', 'backgroundSelected'],
    ['textSecondary', 'background'],
    ['textSecondary', 'backgroundElement'],
    ['primaryText', 'background'],
    ['primaryText', 'backgroundElement'],
    ['onPrimary', 'primary'],
    ['onAccent', 'accent'],
    ['success', 'backgroundElement'],
    ['error', 'backgroundElement'],
  ] as const)('%s on %s', (fg, bg) => {
    expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
