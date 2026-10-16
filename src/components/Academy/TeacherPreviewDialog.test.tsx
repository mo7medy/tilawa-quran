import React, { StrictMode, useState } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TeacherPreviewDialog from './TeacherPreviewDialog';

vi.mock('next-translate/useTranslation', () => ({ default: () => ({ t: (key: string) => key }) }));

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalShowModal) {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  } else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

const DialogHost = (): JSX.Element => {
  const [open, setOpen] = useState(true);
  return open ? (
    <TeacherPreviewDialog label="Book a lesson" onClose={() => setOpen(false)}>
      <div data-testid="lesson-options" />
    </TeacherPreviewDialog>
  ) : (
    <span data-testid="dialog-closed" />
  );
};

describe('Native teacher preview dialog', () => {
  it('stays open through StrictMode effect replay, then closes and restores page scrolling', () => {
    // jsdom lacks the native dialog methods; emulate their public close event.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function showModal(this: HTMLDialogElement): void {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function close(this: HTMLDialogElement): void {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
    render(
      <StrictMode>
        <DialogHost />
      </StrictMode>,
    );
    expect(screen.getByRole('dialog', { name: 'Book a lesson' })).toBeDefined();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'marketplace.close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});
