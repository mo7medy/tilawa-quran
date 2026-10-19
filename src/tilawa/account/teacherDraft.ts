/* eslint-disable react-func/max-lines-per-function -- Form serialization and submission validation stay in one transaction. */
import type { AcademySpecialty } from '../teachers';

import type { TeacherAccount } from './types';

const buildTeacherDraft = (
  data: FormData,
  previous: TeacherAccount,
  photo: string,
  lang: string,
): TeacherAccount | null => {
  const name = String(data.get('name')).trim();
  const specialties = data.getAll('specialty') as AcademySpecialty[];
  const locale = lang === 'ar' ? 'ar' : 'en';
  if (!name || !specialties.length) return null;
  const profile = previous.publicProfile;
  return {
    ...previous,
    country: String(data.get('country')),
    email: String(data.get('email') ?? previous.email),
    phone: String(data.get('phone')),
    experience: Number(data.get('experience')),
    pricing: data.get('pricing') as TeacherAccount['pricing'],
    monthlyPriceCents: Math.round(Number(data.get('monthlyPrice')) * 100),
    monthlyLessons: Number(data.get('monthlyLessons') ?? previous.monthlyLessons),
    publicProfile: {
      ...profile,
      displayName: name,
      gender: data.get('gender') === 'female' ? 'female' : 'male',
      countryLabel: String(data.get('country')),
      specialties,
      displayNameLocalized: { ...profile.displayNameLocalized, [locale]: name },
      photoUrl: photo,
      teachingLanguages: String(data.get('languages'))
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      biography: { ...profile.biography, [locale]: String(data.get('bio')) },
      introduction: { ...profile.introduction, [locale]: String(data.get('bio')).slice(0, 160) },
      approach: { ...profile.approach, [locale]: String(data.get('approach')) },
      qualifications: String(data.get('qualifications'))
        .split('\n')
        .filter(Boolean)
        .map((text) => ({ en: text, ar: text })),
      introductionVideoUrl: String(data.get('video')),
      sessionPriceCents: Math.round(Number(data.get('price')) * 100),
      sessionDurationMinutes: Number(data.get('duration')),
    },
  };
};
export default buildTeacherDraft;
