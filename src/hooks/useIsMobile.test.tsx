import React from 'react';

import { act, cleanup, render, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useIsMobile from './useIsMobile';

const Viewport = (): JSX.Element => <span>{useIsMobile() ? 'mobile' : 'desktop'}</span>;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Responsive hydration', () => {
  it('hydrates desktop server markup on a mobile client without a mismatch', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Viewport />);
    expect(container.textContent).toBe('desktop');
    document.body.append(container);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <Viewport />);
      });
      expect(container.textContent).toBe('mobile');
      expect(errors.mock.calls.flat().join(' ')).not.toMatch(/hydration|did not match/i);
    } finally {
      if (root) await act(async () => root.unmount());
      container.remove();
    }
  });

  it('updates on resize and removes its subscription', () => {
    let onChange: (() => void) | undefined;
    const media = {
      matches: true,
      addEventListener: (event: string, listener: () => void): void => {
        onChange = listener;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => media);
    const view = render(<Viewport />);
    expect(screen.getByText('mobile')).toBeDefined();
    media.matches = false;
    act(() => onChange?.());
    expect(screen.getByText('desktop')).toBeDefined();
    view.unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', onChange);
  });
});
