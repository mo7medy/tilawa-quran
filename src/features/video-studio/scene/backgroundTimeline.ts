export interface BackgroundLayer {
  index: number;
  opacity: number;
  scale: number;
  x: number;
}
export const backgroundLayers = (
  frame: number,
  fps: number,
  durationMs: number,
  count: number,
  animate: boolean,
): BackgroundLayer[] => {
  if (!count) return [];
  const hold = Math.min(12 * fps, Math.max(6 * fps, Math.ceil((durationMs * fps) / 1000 / count)));
  const fade = Math.round(1.2 * fps);
  const segment = Math.floor(frame / hold);
  const local = frame % hold;
  const index = segment % count;
  const progress = Math.min(1, local / fade);
  const eased = progress * progress * (3 - 2 * progress);
  const layer = (image: number, age: number, opacity: number): BackgroundLayer => {
    const p = Math.min(1, age / (hold + fade));
    return {
      index: image,
      opacity,
      scale: animate ? 1.04 + p * 0.05 : 1,
      x: animate ? (image % 2 ? -1 : 1) * (p - 0.5) * 1.2 : 0,
    };
  };
  if (count === 1) {
    const p = Math.min(1, frame / Math.max(1, (durationMs * fps) / 1000));
    return [
      {
        index: 0,
        opacity: 1,
        scale: animate ? 1.04 + p * 0.05 : 1,
        x: animate ? (p - 0.5) * 1.2 : 0,
      },
    ];
  }
  if (!segment || local >= fade) return [layer(index, local, 1)];
  return [layer((segment - 1) % count, local + hold, 1), layer(index, local, eased)];
};
