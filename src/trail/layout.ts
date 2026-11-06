const SWAY = [0, 1, 0, -1];

/** Horizontal center of the node at `index`: a zigzag that never gets closer than `margin` to either edge. */
export function pathX(index: number, width: number, size: number, margin: number, maxSway = 70): number {
  const sway = Math.max(0, Math.min(maxSway, (width - size) / 2 - margin));
  return width / 2 + sway * SWAY[index % SWAY.length];
}
