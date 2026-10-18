/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
import type { TeacherAccount } from '../account/types';
import type { AcademySpecialty, AcademyTeacherProfile } from '../teachers';

import { object, rows, string, bilingual } from './rows';
import type { Row } from './rows';

export const mapTeacher = (value: unknown): AcademyTeacherProfile => {
  const t = object(value);
  const offer = object(t.offer);
  return {
    id: string(t.user_id),
    slug: string(t.slug),
    displayName: string(t.display_name),
    countryLabel: string(t.country),
    gender: t.gender === 'female' ? 'female' : 'male',
    specialties: (Array.isArray(t.specialties) ? t.specialties : []) as AcademySpecialty[],
    sessionPriceCents: typeof offer.price_cents === 'number' ? offer.price_cents : null,
    sessionDurationMinutes: Number(offer.duration_minutes) || 45,
    rating: Number(t.rating) || 0,
    reviewCount: Number(t.review_count) || 0,
    availableToday: false,
    photoUrl: string(t.avatar_url),
    teachingLanguages: Array.isArray(t.teaching_languages) ? t.teaching_languages.map(string) : [],
    biography: bilingual(t.biography),
    approach: bilingual(t.approach),
    introduction: bilingual(t.introduction),
    displayNameLocalized: bilingual(t.display_name_localized),
    qualifications: (Array.isArray(t.qualifications) ? t.qualifications : []).map(bilingual),
    introductionVideoUrl: string(t.video_url),
    isIllustrative: false,
    academyEnabled: !!t.academy_enabled,
    reviews: rows(t.reviews).map((r) => ({
      id: string(r.id),
      name: '',
      rating: Number(r.rating),
      text: { en: string(r.text), ar: string(r.text) },
    })),
  };
};
export const mapTeacherAccount = (t: Row, email = '', phone = ''): TeacherAccount => ({
  publicProfile: mapTeacher(t),
  email,
  phone,
  country: string(t.country),
  experience: Number(t.experience) || 0,
  approval: (t.approval ?? 'incomplete') as TeacherAccount['approval'],
  avatarPath: string(t.avatar_path),
  pricing: (object(t.offer).pricing ?? 'both') as TeacherAccount['pricing'],
  monthlyPriceCents: Number(object(t.offer).monthly_price_cents) || 0,
  monthlyLessons: Number(object(t.offer).monthly_lessons) || 8,
});
