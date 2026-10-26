import { ResolvedVideoManifest } from '../contracts';

export default async function preloadBackgrounds(m: ResolvedVideoManifest): Promise<void> {
  if (m.background.type !== 'image') return;
  const urls = m.background.slides?.map((slide) => slide.url) ?? [m.background.url];
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            resolve();
          };
          image.onerror = () => {
            reject(new Error('BACKGROUND_UNAVAILABLE'));
          };
          image.src = url;
        }),
    ),
  );
}
