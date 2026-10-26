import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';

// Every input URL has already been downloaded by the Python wrapper into this private job directory.
const directory = process.argv[2];
const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
if (!['studio-1', 'studio-2'].includes(manifest.renderVersion) || manifest.fps !== 30)
  throw new Error('MANIFEST_VERSION_MISMATCH');
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1);
  if (!/^[a-z0-9-]+\.(woff2|ttf|mp3|mp4|jpg|png|webp)$/.test(name)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const file = path.join(directory, name);
    const stat = await fs.stat(file);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Accept-Ranges', 'bytes');
    const types = {
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    response.setHeader('Content-Type', types[name.split('.').pop()] ?? 'application/octet-stream');
    const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range ?? '');
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) {
      response.writeHead(416).end();
      return;
    }
    response.setHeader('Content-Length', end - start + 1);
    if (range) {
      response.statusCode = 206;
      response.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    }
    createReadStream(file, { start, end }).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
manifest.fonts.forEach((asset) => {
  asset.url = `${base}/${asset.url}`;
});
manifest.audio.url = `${base}/${manifest.audio.url}`;
if (manifest.background.type !== 'color')
  manifest.background.url = `${base}/${manifest.background.url}`;
manifest.background.slides?.forEach((slide) => {
  slide.url = `${base}/${slide.url}`;
});
const inputProps = { manifest };
const serveUrl = fileURLToPath(new URL('./bundle/', import.meta.url));
const browser = await openBrowser('chrome', { chromeMode: 'headless-shell' });
try {
  const composition = await selectComposition({
    serveUrl,
    id: 'QuranVideo',
    inputProps,
    puppeteerInstance: browser,
  });
  // Each ayah and translation is measured at export dimensions before encoding starts.
  for (const verse of manifest.verses)
    await renderStill({
      serveUrl,
      composition,
      inputProps,
      frame: Math.min(composition.durationInFrames - 1, Math.ceil((verse.startMs * 30) / 1000)),
      output: path.join(directory, 'check.png'),
      puppeteerInstance: browser,
      logLevel: 'error',
    });
  process.stdout.write(`${JSON.stringify({ status: 'rendering', progress: 1 })}\n`);
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    outputLocation: path.join(directory, 'output.mp4'),
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: '128k',
    videoBitrate: '3500k',
    maxRate: '4000k',
    bufferSize: '8000k',
    pixelFormat: 'yuv420p',
    concurrency: 2,
    puppeteerInstance: browser,
    logLevel: 'error',
    onProgress: ({ progress }) => {
      process.stdout.write(
        `${JSON.stringify({ status: 'rendering', progress: Math.floor(progress * 95) })}\n`,
      );
    },
  });
} catch (error) {
  // Only a small error category crosses the process boundary; URLs/text are never logged.
  const code = String(error.message).includes('TEXT_OVERFLOW')
    ? 'TEXT_OVERFLOW'
    : String(error.message).includes('BACKGROUND_UNAVAILABLE')
    ? 'BACKGROUND_UNAVAILABLE'
    : String(error.message).includes('FONT_')
    ? 'FONT_UNAVAILABLE'
    : 'RENDER_FAILED';
  process.stdout.write(`${JSON.stringify({ error: code })}\n`);
  process.exitCode = 1;
} finally {
  await browser.close({ silent: true });
  server.close();
}
