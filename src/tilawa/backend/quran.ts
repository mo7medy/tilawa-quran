/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database, HTTP and translation-key contracts at the boundary. */
import { createHash } from 'crypto';

import { quranActivity } from './quranActivity';
import { bookmarkContext } from './quranBookmarkContext';
import { quranBookmarksRead } from './quranBookmarksRead';
import { quranBookmarksWrite } from './quranBookmarksWrite';
import { quranContext } from './quranContext';
import type { QuranContext } from './quranContext';
import { quranNotes } from './quranNotes';
import { quranPins } from './quranPins';
import { quranPreferences } from './quranPreferences';
import { quranSessions } from './quranSessions';

import { BackendError } from '@/lib/supabase/server';

export const handleQuranAccount = async (
  ...args: Parameters<typeof quranContext>
): Promise<void> => {
  const context = quranContext(...args);
  const { route, client, user, res, get, body, command, path } = context;
  if (route === 'users/profile') {
    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    res.json({
      id: user.id,
      firstName: data.display_name,
      lastName: '',
      email: user.email,
      photoUrl: null,
      requiredFields: [],
      announcement: null,
      consents: {},
      createdAt: user.created_at,
      lastSyncAt: null,
      isPasswordSet: (user.app_metadata.providers ?? []).includes('email'),
    });
    return;
  }
  if (route === 'feature-flags') {
    // External community/publication features do not share the website identity.
    res.json({});
    return;
  }
  if (route === 'users/syncLocalData' && !get) {
    const importKey = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    await command('sync.import', { ...body, pinnedItems: body.pinnedVerses ?? [], importKey });
    res.json({ success: true, lastSyncAt: new Date().toISOString() });
    return;
  }

  if (['bookmarks', 'collections'].includes(path[0])) {
    const data = await bookmarkContext(context);
    await (get ? quranBookmarksRead(data) : quranBookmarksWrite(data));
    return;
  }
  const handlers: Record<string, (input: QuranContext) => Promise<void>> = {
    notes: quranNotes,
    preferences: quranPreferences,
    'reading-sessions': quranSessions,
    'pinned-items': quranPins,
    goal: quranActivity,
    'activity-days': quranActivity,
    streak: quranActivity,
  };
  if (handlers[path[0]]) {
    await handlers[path[0]](context);
    return;
  }
  throw new BackendError('FEATURE_NOT_AVAILABLE', 503);
};
export { rangeContains, rangesOverlap } from './quranRanges';
export { calculateStreak } from './quranProgress';
