/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import { object, string } from './mappers';
import type { Row } from './mappers';

import type UserProfile from '@/types/auth/UserProfile';

export const legacyWebsiteProfile = (snapshot: Row): UserProfile => {
  const profile = object(snapshot.profile);
  return {
    id: string(profile.id),
    firstName: string(profile.display_name),
    lastName: '',
    email: string(snapshot.email),
    createdAt: string(profile.created_at),
    photoUrl: string(profile.avatar_url) || null,
    requiredFields: [],
    announcement: null,
    consents: {},
    isPasswordSet: !!snapshot.hasPassword,
  };
};
