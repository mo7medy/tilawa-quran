/* eslint-disable react-func/max-lines-per-function, @typescript-eslint/naming-convention -- Connected messaging scenarios use real database field names. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accountTestRoute, routeAccount } from '../accountTestSetup';

import { fixture, history } from './messageTestSetup';

beforeEach(() => {
  routeAccount('profile', ['messages']);
  accountTestRoute.query.conversation = 'one';
  history.messages = [];
  history.retry.mockResolvedValue(undefined);
  Object.assign(accountTestRoute, {
    push: vi.fn().mockResolvedValue(true),
    replace: vi.fn().mockResolvedValue(true),
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('Professional messaging flow', () => {
  it('shows the empty conversation and removes the new-message indicator after cleanup', () => {
    const { app } = fixture();
    history.messages = [{ id: 'first', sender_id: 'other', body: 'Original history' }];
    const view = render(app());
    const viewport = screen.getByRole('log').parentElement!;
    Object.defineProperties(viewport, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
    });
    fireEvent.scroll(viewport, { target: { scrollTop: 0 } });
    history.messages = [
      ...history.messages,
      { id: 'second', sender_id: 'other', body: 'Incoming' },
    ];
    view.rerender(app());
    expect(screen.getByRole('button', { name: /New messages/ })).toBeTruthy();
    history.messages = [];
    view.rerender(app());
    expect(screen.queryByRole('button', { name: /New messages/ })).toBeNull();
    expect(screen.getByText('Start your conversation here.')).toBeTruthy();
    expect(screen.queryByText('Original history')).toBeNull();
    expect(screen.queryByText('Incoming')).toBeNull();
    expect(screen.getByLabelText('Your message')).toBeTruthy();
  });
  it('allows only the first introductory message while an outgoing request is pending', () => {
    const { app, snapshot } = fixture('pending');
    snapshot.conversations = snapshot.conversations.map((conversation) => ({
      ...conversation,
      requested_by: 'self',
    }));
    const view = render(app());
    expect((screen.getByLabelText('Your message') as HTMLTextAreaElement).disabled).toBe(false);
    history.messages = [{ id: 'intro', sender_id: 'self', body: 'Hello' }];
    view.rerender(app());
    expect((screen.getByLabelText('Your message') as HTMLTextAreaElement).disabled).toBe(true);
  });
  it('does not mark a hidden conversation read until the document is visible', () => {
    let visibility: DocumentVisibilityState = 'hidden';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    const { app, command } = fixture();
    render(app());
    expect(command).not.toHaveBeenCalled();
    visibility = 'visible';
    fireEvent(document, new Event('visibilitychange'));
    expect(command).toHaveBeenCalledWith('conversation', {
      conversationId: 'one',
      operation: 'read',
    });
  });
  it('retains a failed draft, retries once, and rejects duplicate in-flight sends', async () => {
    const { command, app } = fixture();
    let complete: () => void = () => {};
    let rejectMessage = true;
    command.mockImplementation((action) => {
      if (action !== 'message') return Promise.resolve({ ok: true });
      if (rejectMessage) return Promise.reject(Error('Offline'));
      return new Promise<void>((resolve) => {
        complete = resolve;
      });
    });
    render(app());
    const input = screen.getByLabelText('Your message');
    fireEvent.change(input, { target: { value: 'Reading question' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    await screen.findByText(
      'Your message was not sent. Your draft is still here; please try again.',
    );
    expect((input as HTMLTextAreaElement).value).toBe('Reading question');
    rejectMessage = false;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(command.mock.calls.filter(([action]) => action === 'message')).toHaveLength(2);
    await act(async () => complete());
    await waitFor(() => expect((input as HTMLTextAreaElement).value).toBe(''));
  });
  it('keeps separate drafts when switching conversations', () => {
    const { app } = fixture();
    const view = render(app());
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'Draft for Ahmed' },
    });
    accountTestRoute.query.conversation = 'two';
    view.rerender(app());
    expect((screen.getByLabelText('Your message') as HTMLTextAreaElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'Draft for Nour' },
    });
    accountTestRoute.query.conversation = 'one';
    view.rerender(app());
    expect((screen.getByLabelText('Your message') as HTMLTextAreaElement).value).toBe(
      'Draft for Ahmed',
    );
  });
  it('shows incoming request actions and prevents sending before acceptance', () => {
    const { app, command } = fixture('pending');
    render(app());
    expect((screen.getByLabelText('Your message') as HTMLTextAreaElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Accept request' }));
    expect(command).toHaveBeenCalledWith('conversation', {
      conversationId: 'one',
      operation: 'accept',
    });
  });
  it('disables blocked conversations and supports search without changing the selected draft', () => {
    const { app } = fixture('accepted', true);
    render(app());
    expect((screen.getByLabelText('Your message') as HTMLTextAreaElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Nour' } });
    expect(screen.queryByRole('button', { name: /Ahmed/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Nour/ })).toBeDefined();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no match' } });
    expect(screen.getByText('No matching conversations on this page.')).toBeDefined();
  });
  it('keeps Enter as a new line and sends only with the deliberate keyboard shortcut', async () => {
    const { app, command } = fixture();
    render(app());
    const input = screen.getByLabelText('Your message');
    fireEvent.change(input, { target: { value: 'Keyboard question' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(command.mock.calls.filter(([action]) => action === 'message')).toHaveLength(0);
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('message', {
        conversationId: 'one',
        text: 'Keyboard question',
      }),
    );
  });
});
