import { pathX } from '@/trail/layout';

test.each([280, 320, 390, 800])('zigzag stays inside the margins at width %i', (width) => {
  for (let i = 0; i < 12; i++) {
    const x = pathX(i, width, 64, 24);
    expect(x - 32).toBeGreaterThanOrEqual(24);
    expect(x + 32).toBeLessThanOrEqual(width - 24);
  }
});

test('nodes alternate sides', () => {
  const [a, b, c, d] = [0, 1, 2, 3].map((i) => pathX(i, 390, 64, 24));
  expect(b).toBeGreaterThan(a);
  expect(a).toBe(c);
  expect(d).toBeLessThan(a);
});
