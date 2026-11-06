/** `YYYY-MM-DD` in the device's time zone: the one place that decides when a day turns. */
export const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const studyDaysText = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'} estudando`;
