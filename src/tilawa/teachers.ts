import SAMPLE_TEACHERS from './teacherSamples';

/**
 * Tilawa academy teachers data contract (frontend shape).
 *
 * Current UI: clearly labelled design fixtures, with no live booking. When the Supabase project
 * lands (later phase), this module gains fetchers against the approved-only
 * marketplace RPC; the `AcademyTeacherProfile` shape below is the target
 * contract, mirroring APP `TeacherProfile` + marketplace aggregates.
 */

/** Teacher specialties taught by the academy (APP `TeacherSpecialtyIds` parity). */
export type AcademySpecialty =
  | 'memorization'
  | 'tajweed'
  | 'fiqh'
  | 'aqeedah'
  | 'arabic_for_non_arabic_speakers';

/** Display currency for the academy website. Prices are integer USD cents. */
export const TEACHERS_CURRENCY = 'USD';

/** Public profile contract; design fixtures are explicitly isIllustrative. */
export interface AcademyTeacherProfile {
  id: string;
  slug: string;
  displayName: string;
  countryLabel: string;
  gender: 'male' | 'female';
  specialties: AcademySpecialty[];
  /** Integer USD cents. `null` until the teacher publishes pricing. */
  sessionPriceCents: number | null;
  sessionDurationMinutes: number;
  rating: number;
  reviewCount: number;
  availableToday: boolean;
  /** Real teacher-owned content, or explicitly labelled design-fixture content. */
  photoUrl?: string;
  teachingLanguages?: string[];
  introduction?: { en: string; ar: string };
  displayNameLocalized?: { en: string; ar: string };
  biography?: { en: string; ar: string };
  approach?: { en: string; ar: string };
  qualifications?: { en: string; ar: string }[];
  isIllustrative?: boolean;
  introductionVideoUrl?: string;
  introductionCaptionsUrl?: string;
  introductionVideoLanguage?: string;
  completedLessons?: number;
  reviews?: { id: string; name: string; rating: number; text: { en: string; ar: string } }[];
  lessonRatings?: { reassurance: number; clarity: number; progress: number; preparation: number };
}

/** Preview records remain distinct from the future approved-teacher directory. */
export interface TeachersDirectoryState {
  status: 'empty' | 'ready' | 'preview';
  teachers: AcademyTeacherProfile[];
}

/** Current directory is a visual preview until the independent backend is connected.
 *
 * @returns {TeachersDirectoryState} labelled illustrative records
 */
export const getTeachersDirectoryState = (): TeachersDirectoryState => ({
  status: 'preview',
  teachers: SAMPLE_TEACHERS,
});

/** Public design records only; replace with the approved-only backend adapter.
 * @returns {AcademyTeacherProfile | undefined} matching preview record
 */
export const getTeacherBySlug = (slug: string): AcademyTeacherProfile | undefined =>
  getTeachersDirectoryState().teachers.find((teacher) => teacher.slug === slug);

export const getTeacherName = (teacher: AcademyTeacherProfile, locale: string): string =>
  teacher.displayNameLocalized?.[locale === 'ar' ? 'ar' : 'en'] ?? teacher.displayName;
