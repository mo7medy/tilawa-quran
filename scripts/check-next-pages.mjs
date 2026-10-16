import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pagesDir = fileURLToPath(new URL('../src/pages/', import.meta.url));
const nonPageName = /(?:\.(?:test|spec|stories)|TestState|TestFixtures)\.[jt]sx?$/;

const findNonPages = async (directory) => {
  const invalid = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      invalid.push(...(await findNonPages(entryPath)));
    } else if (nonPageName.test(entry.name)) {
      invalid.push(path.relative(pagesDir, entryPath));
    }
  }
  return invalid;
};

const invalid = await findNonPages(pagesDir);
if (invalid.length) {
  throw new Error(
    `Move tests and test helpers outside src/pages before building:\n${invalid.join('\n')}`,
  );
}
console.log('Next.js page-entry check passed.');
