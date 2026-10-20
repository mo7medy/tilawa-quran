import { unstable_serialize as serialize } from 'swr';
import { describe, expect, it, vi } from 'vitest';

import { clearPrivateSwr } from './clearPrivateSwr';

describe('Installed SWR account cache isolation', () => {
  it('clears serialized account and infinite-history keys without discarding the public directory', () => {
    const privateKey = serialize(['tilawa-view', 'previous-user', 'account/view?view=profile']);
    const messages = `$inf$${serialize([
      'tilawa-messages',
      'previous-user',
      'messages?conversation=one',
    ])}`;
    const cache = new Map([
      [privateKey, 'private'],
      [messages, 'history'],
      ['tilawa-public-teachers', 'public'],
    ]);
    const reset = vi.fn();
    clearPrivateSwr(cache, reset);
    expect(cache.has(privateKey)).toBe(false);
    expect(cache.has(messages)).toBe(false);
    expect(cache.get('tilawa-public-teachers')).toBe('public');
    expect(reset).toHaveBeenCalledTimes(2);
  });
});
