import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const output = path.resolve(process.argv[2] ?? path.join(root, '.video-studio-assets'));
const fonts = [
  '/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2',
  '/fonts/quran/hafs/nastaleeq/indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2',
  '/fonts/lang/arabic/NotoNaskhArabic-Regular.woff2',
  '/fonts/lang/Figtree/Figtree.ttf',
  '/fonts/lang/bengali/NotoSerifBengali-Regular.woff2',
  '/fonts/lang/urdu/MehrNastaliqWeb.woff2',
  '/fonts/lang/vietnamese/BeVietnamPro-Regular.woff2',
  '/fonts/lang/kurdish/droid-naskh-regular.woff2',
  '/fonts/lang/dhivehi/DhivehiAkuru.woff2',
];
for (const version of ['v1', 'v2', 'v4/colrv1'])
  for (let page = 1; page <= 604; page += 1)
    fonts.push(`/fonts/quran/hafs/${version}/woff2/p${page}.woff2`);
const files = {};
await fs.mkdir(path.join(output, 'blobs'), { recursive: true });
const add = async (id, source, mime) => {
  let bytes;
  try {
    bytes = await fs.readFile(path.join(root, 'public', source));
  } catch {
    throw new Error(
      `Required tracked asset missing: ${source}. Restore public/fonts and public/publicMin/videos from this checkout before publishing.`,
    );
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const key = `blobs/${sha256}`;
  await fs.writeFile(path.join(output, key), bytes);
  files[id] = { key, sha256, mime };
};
for (const font of fonts) await add(font, font, font.endsWith('.ttf') ? 'font/ttf' : 'font/woff2');
for (const id of ['sea', 'abstract', 'windmill', 'stars', 'nature', 'snow'])
  await add(`background-${id}`, `/publicMin/videos/videos_${id}.mp4`, 'video/mp4');
const assetVersion = createHash('sha256').update(JSON.stringify(files)).digest('hex');
await fs.writeFile(
  path.join(output, 'manifest.json'),
  JSON.stringify({ renderVersion: 'studio-1', assetVersion, files }),
);
console.log(JSON.stringify({ assetVersion, files: Object.keys(files).length }));
