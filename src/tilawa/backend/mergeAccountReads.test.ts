/* eslint-disable @typescript-eslint/naming-convention -- Wire contracts use database column names. */
/* eslint-disable react-func/max-lines-per-function -- Regression assertions follow a single section merge. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { mergeAccountReads } from './mergeAccountReads';
import { signSnapshot } from './teachers';

describe('Owner identity across account section reads', () => {
  it('does not manufacture identity fields in a lesson response', async () => {
    const section = await signSnapshot({} as SupabaseClient, { lessons: [] });
    expect(section).toEqual({ lessons: [] });
  });
  it('keeps bootstrap identity and permissions even if a section supplies empty or conflicting keys', () => {
    const base = {
      profile: { display_name: 'Amina', avatar_url: '/own' },
      student: { learning_goal: 'Arabic' },
      email: 'own@example.com',
      teacher: null,
      isAdmin: false,
      teachers: [{ user_id: 'self', display_name: 'Original' }],
    };
    const merged = mergeAccountReads(base, {
      profile: {},
      email: '',
      teacher: {},
      isAdmin: true,
      lessons: [{ id: 'lesson' }],
      teachers: [{ user_id: 'self', display_name: 'Other' }, { user_id: 'peer' }],
    });
    expect(merged.profile).toEqual(base.profile);
    expect(merged.student).toEqual(base.student);
    expect(merged.isAdmin).toBe(false);
    expect(merged.teacher).toBeNull();
    expect(merged.lessons).toEqual([{ id: 'lesson' }]);
    expect(merged.teachers).toEqual([
      { user_id: 'self', display_name: 'Original' },
      { user_id: 'peer' },
    ]);
  });
});
