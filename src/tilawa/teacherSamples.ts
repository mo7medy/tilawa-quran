import type { AcademyTeacherProfile } from './teachers';

// Explicit design fixtures, never real approved/bookable teachers. No invented
// certificates, prices, ratings, reviews, availability claims or real identities.
const common = {
  countryLabel: '',
  teachingLanguages: ['en', 'ar'],
  sessionPriceCents: null,
  sessionDurationMinutes: 45,
  rating: 0,
  reviewCount: 0,
  availableToday: false,
  isIllustrative: true,
  qualifications: [],
};

const SAMPLE_TEACHERS: AcademyTeacherProfile[] = [
  {
    ...common,
    id: 'sample-a',
    slug: 'sample-teacher-a',
    displayName: 'Sample teacher A',
    gender: 'male',
    displayNameLocalized: { en: 'Sample teacher A', ar: 'معلّم توضيحي أ' },
    specialties: ['tajweed', 'memorization'],
    photoUrl: '/tilawa/academy/teacher-a.webp',
    introduction: {
      en: 'Build a strong foundation in Quran recitation with clear, step-by-step guidance.',
      ar: 'ابنِ أساسًا قويًا في تلاوة القرآن مع توجيه واضح خطوة بخطوة.',
    },
    biography: {
      en: 'This illustrative profile shows how a teacher can introduce their work with learners of all ages. The program focuses on confident recitation, practical Tajweed and a revision routine adapted to each learner.',
      ar: 'يعرض هذا الملف التوضيحي كيف يعرّف المعلّم بدروسه لجميع الأعمار. يركّز البرنامج على التلاوة الواثقة والتجويد العملي وخطة مراجعة تناسب كل طالب.',
    },
    approach: {
      en: 'Listen, practise, receive feedback, and revisit what you have learned.',
      ar: 'استماع وتطبيق، ثم ملاحظات شخصية ومراجعة لما تعلّمته.',
    },
  },
  {
    ...common,
    id: 'sample-b',
    slug: 'sample-teacher-b',
    displayName: 'Sample teacher B',
    gender: 'female',
    displayNameLocalized: { en: 'Sample teacher B', ar: 'معلّمة توضيحية ب' },
    specialties: ['arabic_for_non_arabic_speakers'],
    photoUrl: '/tilawa/academy/teacher-b.webp',
    introduction: {
      en: 'Develop practical Arabic for real-life use, with a focus on clarity and confidence.',
      ar: 'طوّر لغتك العربية للاستخدام اليومي، مع التركيز على الوضوح والثقة.',
    },
    biography: {
      en: 'This illustrative profile presents a personal Arabic learning journey for non-native speakers of all ages, from their first letters to reading and everyday conversation. Lessons can be introduced in English and adapted to the learner’s starting point.',
      ar: 'يقدّم هذا الملف التوضيحي مسارًا شخصيًا للعربية لغير الناطقين بها من جميع الأعمار، من الحروف الأولى إلى القراءة والتواصل اليومي، مع شرح بالإنجليزية يناسب مستوى الطالب.',
    },
    approach: {
      en: 'Useful conversation, guided reading, and practice linked to your daily life.',
      ar: 'محادثة مفيدة وقراءة موجّهة وتطبيق مرتبط بحياتك اليومية.',
    },
  },
  {
    ...common,
    id: 'sample-c',
    slug: 'sample-teacher-c',
    displayName: 'Sample teacher C',
    gender: 'male',
    displayNameLocalized: { en: 'Sample teacher C', ar: 'معلّم توضيحي ج' },
    specialties: ['memorization', 'tajweed'],
    photoUrl: '/tilawa/academy/teacher-c.webp',
    introduction: {
      en: 'A personal memorization journey with structured revision and steady progress.',
      ar: 'رحلة حفظ شخصية مع مراجعة منظّمة وتقدّم مستمر.',
    },
    biography: {
      en: 'This illustrative profile shows a memorization and revision program for all ages. A teacher can describe how they help learners set realistic goals, consolidate previous memorization and build a sustainable routine.',
      ar: 'يعرض هذا الملف التوضيحي برنامجًا للحفظ والمراجعة لجميع الأعمار، وكيف يساعد المعلّم الطالب على تحديد أهداف مناسبة وتثبيت المحفوظ وبناء عادة مستمرة.',
    },
    approach: {
      en: 'A manageable new portion, guided revision, and personal feedback.',
      ar: 'ورد جديد مناسب ومراجعة موجّهة وملاحظات شخصية.',
    },
  },
];

export default SAMPLE_TEACHERS;
