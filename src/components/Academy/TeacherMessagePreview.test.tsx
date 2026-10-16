import React from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SAMPLE_TEACHERS from '../../tilawa/teacherSamples';

import TeacherMessagePreview from './TeacherMessagePreview';

vi.mock('next-translate/useTranslation', () => ({
  default: () => ({ t: (key: string) => key, lang: 'en' }),
}));
afterEach(cleanup);

describe('Teacher message design preview', () => {
  it('rejects whitespace and clears the preview when its draft changes', () => {
    render(<TeacherMessagePreview teacher={SAMPLE_TEACHERS[0]} />);
    const message = screen.getByRole('textbox', { name: 'marketplace.your-message' });
    const button = screen.getByRole('button', {
      name: 'marketplace.preview-message',
    }) as HTMLButtonElement;
    fireEvent.change(message, { target: { value: '   ' } });
    expect(button.disabled).toBe(true);
    fireEvent.change(message, { target: { value: 'Can we discuss my learning goals?' } });
    fireEvent.click(button);
    expect(screen.getByRole('status').textContent).toContain('marketplace.message-not-sent');
    fireEvent.change(message, { target: { value: 'Another question' } });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
