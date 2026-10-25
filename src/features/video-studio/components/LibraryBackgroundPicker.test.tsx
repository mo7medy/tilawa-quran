import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { defaultSpec, StudioCatalog } from '../contracts';

import LibraryBackgroundPicker from './LibraryBackgroundPicker';

vi.mock('next-translate/useTranslation', () => ({
  default: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${values.collection} / ${values.orientation} / ${values.number}` : key,
  }),
}));
afterEach(cleanup);
const catalog: StudioCatalog = {
  chapters: [],
  reciters: [],
  translations: [],
  enabled: true,
  backgrounds: [
    {
      id: 'r2-portrait_01',
      url: '/api/video-studio/backgrounds/r2-portrait_01',
      type: 'image',
      orientation: 'portrait',
      collection: 'nature',
      number: 1,
      width: 1280,
      height: 1920,
    },
    { id: 'sea', url: '/api/video-studio/assets/background-sea', type: 'video' },
  ],
};

it('previews the selected R2 image and preserves the legacy video selector', () => {
  const change = vi.fn();
  const spec = {
    ...defaultSpec,
    background: { ...defaultSpec.background, type: 'library' as const, value: 'r2-portrait_01' },
  };
  const { rerender } = render(
    <LibraryBackgroundPicker spec={spec} catalog={catalog} change={change} />,
  );
  const image = screen.getByRole('img');
  expect(image.getAttribute('src')).toBe('/api/video-studio/backgrounds/r2-portrait_01');
  expect(image.getAttribute('alt')).toContain('ratios.portrait');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sea' } });
  expect(change).toHaveBeenCalledWith({ background: { ...spec.background, value: 'sea' } });
  rerender(
    <LibraryBackgroundPicker
      spec={{ ...spec, background: { ...spec.background, value: 'sea' } }}
      catalog={catalog}
      change={change}
    />,
  );
  expect(screen.queryByRole('img')).toBeNull();
});
