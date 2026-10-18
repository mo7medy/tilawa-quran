import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { assertProject, assertLinkedProject, cli, projectKeys, PROJECT_URL } from './project.mjs';

assertProject();
assertLinkedProject();
const keys = projectKeys();
const publicKey = (
  keys.find((k) => k.type === 'publishable') ?? keys.find((k) => k.name === 'anon')
)?.api_key;
const secret = (
  keys.find((k) => k.name === 'service_role') ?? keys.find((k) => k.type === 'secret')
)?.api_key;
if (!publicKey || !secret) throw new Error('Trusted test setup credentials unavailable');
const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const admin = createClient(PROJECT_URL, secret, options);
const people = [];
const uploadedFiles = [];
let checks = 0;
const assert = (condition, label) => {
  if (!condition) throw new Error(`FAIL: ${label}`);
  checks += 1;
  process.stdout.write(`PASS ${label}\n`);
};
const sql = (query) => JSON.parse(cli('db', 'query', '--linked', query, '--output', 'json')).rows;
const command = (person, action, payload, key = randomUUID()) =>
  person.client.rpc('tilawa_command', { action, payload, request_key: key });
const must = async (promise, label) => {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.code} ${result.error.message}`);
  return result.data;
};
const createPerson = async (label) => {
  const email = `tilawa-test-${randomUUID()}@example.test`;
  const password = `${randomUUID()}Aa1!`;
  const { user } = await must(
    admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: `[TEST] ${label}` },
    }),
    'create test account',
  );
  const person = {
    id: user.id,
    email,
    password,
    client: createClient(PROJECT_URL, publicKey, options),
  };
  people.push(person);
  await must(person.client.auth.signInWithPassword({ email, password }), 'test sign in');
  return person;
};
const teacherDraft = (name) => ({
  country: 'Egypt',
  experience: 3,
  phone: '',
  pricing: 'both',
  monthlyPriceCents: 9000,
  monthlyLessons: 8,
  publicProfile: {
    displayName: `[TEST] ${name}`,
    photoUrl: '',
    specialties: ['tajweed', 'memorization', 'arabic_for_non_arabic_speakers'],
    teachingLanguages: ['English', 'العربية'],
    biography: { en: 'Test teacher biography', ar: 'ملف اختبار' },
    approach: { en: 'Test teaching', ar: 'اختبار' },
    introduction: { en: 'Test', ar: 'اختبار' },
    qualifications: [],
    displayNameLocalized: {},
    sessionPriceCents: 1500,
    sessionDurationMinutes: 45,
    introductionVideoUrl: '',
  },
});
try {
  const [student, other, teacher, teacher2, owner] = await Promise.all(
    ['Student A', 'Student B', 'Teacher A', 'Teacher B', 'Admin'].map(createPerson),
  );
  sql(`insert into private.admin_memberships(user_id) values ('${owner.id}');`);
  for (const person of [student, other])
    await must(
      command(person, 'student', {
        value: {
          name: '[TEST] Learner',
          country: 'UK',
          birthDate: '2012-01-01',
          goal: 'Reading',
          schedule: 'Evening',
          zone: 'UTC',
          photo: '',
        },
      }),
      'student save',
    );
  assert(
    !(await student.client.from('student_profiles').select('*').eq('user_id', other.id)).data
      ?.length,
    'RLS hides another student',
  );
  assert(
    !(await owner.client.from('student_profiles').select('*').eq('user_id', student.id)).data
      ?.length,
    'teacher-approval admin cannot read private student profile',
  );
  assert(
    !!(await student.client.from('profiles').update({ display_name: 'bad' }).eq('id', student.id))
      .error,
    'direct profile writes denied',
  );
  assert(
    !!(await command(student, 'admin-settings', { teacherRegistrationEnabled: false })).error,
    'student cannot administer',
  );
  for (const person of [teacher, teacher2]) {
    await must(command(person, 'teacher', { value: teacherDraft('Teacher') }), 'teacher save');
    await must(command(person, 'submit-teacher', {}), 'teacher submit');
    assert(
      !!(await command(person, 'admin-teacher', { id: person.id, approval: 'approved' })).error,
      'teacher cannot self approve',
    );
    await must(
      command(owner, 'admin-teacher', {
        id: person.id,
        approval: 'approved',
        academyEnabled: true,
      }),
      'admin approve',
    );
  }
  const catalogue = await must(student.client.rpc('tilawa_public_teachers'), 'public catalogue');
  assert(
    catalogue.filter((t) => [teacher.id, teacher2.id].includes(t.user_id)).length === 2,
    'approved teachers appear without rebuild',
  );
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  date.setUTCHours(15, 0, 0, 0);
  const at = date.toISOString();
  for (const person of [teacher, teacher2])
    await must(
      command(person, 'availability', {
        zone: 'UTC',
        value: [
          { day: date.getUTCDay(), start: '15:00', end: '16:00' },
          { day: date.getUTCDay(), start: '17:00', end: '18:00' },
        ],
      }),
      'availability save',
    );
  assert(
    !!(
      await command(teacher, 'availability', {
        zone: 'UTC',
        value: [
          { day: 1, start: '10:00', end: '11:00' },
          { day: 1, start: '10:30', end: '11:30' },
        ],
      })
    ).error,
    'overlapping availability rejected',
  );
  const base = { teacherId: teacher.id, scheduledAt: at, lessonType: 'intro', subject: 'quran' };
  assert(
    !!(await command(student, 'book', { ...base, lessonType: 'follow_up' })).error,
    'paid booking blocked before gateway',
  );
  const concurrent = await Promise.all([
    command(student, 'book', base),
    command(other, 'book', base),
  ]);
  assert(concurrent.filter((r) => !r.error).length === 1, 'one concurrent slot winner');
  const index = concurrent[0].error ? 1 : 0;
  const learner = index ? other : student;
  const bookingId = concurrent[index].data.id;
  const acceptKey = randomUUID();
  const accepted = await must(
    command(teacher, 'request', { id: bookingId, accept: true }, acceptKey),
    'accept booking',
  );
  const acceptedAgain = await must(
    command(teacher, 'request', { id: bookingId, accept: true }, acceptKey),
    'replayed acceptance',
  );
  assert(accepted.lessonId === acceptedAgain.lessonId, 'acceptance replay is idempotent');
  assert(!!(await command(learner, 'book', base)).error, 'second active intro blocked');
  assert(
    !(await other.client.from('lessons').select('*').eq('id', accepted.lessonId)).data?.length ||
      learner.id === other.id,
    'unrelated lesson hidden',
  );
  const conversation = await must(
    command(learner, 'conversation', { peerId: teacher.id }),
    'open conversation',
  );
  await must(
    command(learner, 'message', { conversationId: conversation.id, text: 'First test request' }),
    'first message',
  );
  assert(
    !!(
      await command(learner, 'message', {
        conversationId: conversation.id,
        text: 'Cannot spam requests',
      })
    ).error,
    'message request waits for recipient',
  );
  await must(
    command(teacher, 'conversation', { conversationId: conversation.id, operation: 'accept' }),
    'accept conversation',
  );
  await must(
    command(teacher, 'message', {
      conversationId: conversation.id,
      text: 'Accepted test conversation',
    }),
    'teacher message',
  );
  assert(
    (await must(learner.client.rpc('tilawa_snapshot'), 'snapshot')).messages.length === 2,
    'messages shared by participants',
  );
  const quran = await must(
    learner.client.rpc('tilawa_quran_command', {
      action: 'bookmark.save',
      payload: { type: 'ayah', key: 22, verseNumber: 1, mushaf: 1 },
    }),
    'bookmark save',
  );
  assert(quran.user_id === learner.id, 'bookmark belongs to session');
  await must(
    learner.client.rpc('tilawa_quran_command', {
      action: 'note.save',
      payload: { body: 'Private test note', ranges: ['22:1-22:3'] },
    }),
    'note save',
  );
  assert(
    !(await teacher.client.from('quran_notes').select('*').eq('user_id', learner.id)).data?.length,
    'teacher cannot read private Quran notes',
  );
  const foreignCollection = await must(
    other.client.rpc('tilawa_quran_command', {
      action: 'collection.save',
      payload: { name: 'Private' },
    }),
    'other collection',
  );
  if (other.id !== learner.id)
    assert(
      !!(
        await learner.client.rpc('tilawa_quran_command', {
          action: 'bookmark.save',
          payload: {
            type: 'ayah',
            key: 22,
            verseNumber: 2,
            mushaf: 1,
            collectionId: foreignCollection.id,
          },
        })
      ).error,
      'cross-owner collection link denied',
    );
  await must(
    command(learner, 'lesson', { id: accepted.lessonId, operation: 'cancel' }),
    'free intro cancel',
  );
  assert(
    (await must(learner.client.rpc('tilawa_snapshot'), 'cancel snapshot')).lessons.find(
      (l) => l.id === accepted.lessonId,
    ).status === 'cancelled',
    'free cancellation updates both views',
  );
  assert(
    !!(await command(teacher, 'withdrawal', { amountCents: 1, method: 'bank' })).error,
    'no withdrawal from empty balance',
  );
  const funded = sql(`with o as (
    insert into public.orders(student_id,plan_id,kind,subject,amount_cents,terms,status) values('${learner.id}','progress','academy','arabic',10000,'{}','paid') returning id
  ), p as (
    insert into public.payment_transactions(order_id,status,amount_cents) select id,'paid',10000 from o returning id
  ) insert into public.student_subscriptions(student_id,kind,plan_id,payment_id,subject,included_lessons,duration_minutes,price_cents,gift_lessons,starts_at,ends_at,access_ends_at)
  select '${learner.id}','academy','progress',id,'arabic',12,45,10000,1,now(),now()+interval '30 days',now()+interval '35 days' from p returning id;`)[0]
    .id;
  const balance = async (bucket) =>
    (
      await must(
        learner.client
          .from('subscription_credit_ledger')
          .select('delta')
          .eq('subscription_id', funded)
          .eq('bucket', bucket),
        'credit balance',
      )
    ).reduce((sum, row) => sum + row.delta, 0);
  assert(
    (await balance('regular')) === 12 && (await balance('gift')) === 1,
    'verified plan grants twelve credits and one gift',
  );
  assert(
    !!(await learner.client.from('student_subscriptions').insert({ student_id: learner.id })).error,
    'browser cannot activate paid subscriptions',
  );
  await must(command(learner, 'gift', { id: funded, gift: 'memorization' }), 'choose gift');
  const gift = await must(
    command(learner, 'book', {
      ...base,
      teacherId: teacher2.id,
      subject: 'quran',
      lessonType: 'follow_up',
      subscriptionId: funded,
      bucket: 'gift',
    }),
    'gift from Arabic plan',
  );
  assert((await balance('gift')) === 0, 'gift credit reserved exactly once');
  assert(
    !!(await command(learner, 'gift', { id: funded, gift: 'recitation' })).error,
    'gift selection locked while reserved',
  );
  await must(command(teacher2, 'request', { id: gift.id, accept: false }), 'reject gift');
  assert((await balance('gift')) === 1, 'rejected gift restores credit');
  const paidBooking = await must(
    command(learner, 'book', {
      ...base,
      subject: 'arabic',
      lessonType: 'follow_up',
      subscriptionId: funded,
      bucket: 'regular',
    }),
    'academy booking',
  );
  assert((await balance('regular')) === 11, 'regular credit reservation');
  assert(
    !!(await command(owner, 'request', { id: paidBooking.id, accept: true })).error,
    'admin cannot accept teacher lessons',
  );
  const paidLesson = await must(
    command(teacher, 'request', { id: paidBooking.id, accept: true }),
    'accept academy booking',
  );
  await must(
    command(learner, 'lesson', { id: paidLesson.lessonId, operation: 'cancel' }),
    'request credit cancellation',
  );
  assert(
    !!(
      await command(learner, 'lesson', {
        id: paidLesson.lessonId,
        operation: 'confirm-cancellation',
      })
    ).error,
    'requester cannot confirm own cancellation',
  );
  await must(
    command(teacher, 'lesson', { id: paidLesson.lessonId, operation: 'confirm-cancellation' }),
    'confirm credit cancellation',
  );
  assert((await balance('regular')) === 12, 'cancellation restores regular credit once');
  assert(
    !!(
      await command(teacher, 'lesson', {
        id: paidLesson.lessonId,
        operation: 'confirm-cancellation',
      })
    ).error,
    'duplicate cancellation cannot restore again',
  );
  const completedBooking = await must(
    command(learner, 'book', {
      ...base,
      subject: 'arabic',
      lessonType: 'follow_up',
      subscriptionId: funded,
      bucket: 'regular',
    }),
    'next academy booking',
  );
  const completedLesson = await must(
    command(teacher, 'request', { id: completedBooking.id, accept: true }),
    'accept next booking',
  );
  assert(
    !!(
      await command(teacher, 'lesson', {
        id: completedLesson.lessonId,
        operation: 'request-completion',
      })
    ).error,
    'early completion is blocked',
  );
  sql(
    `update public.lessons set scheduled_at=now()-interval '2 hours' where id='${completedLesson.lessonId}'; update public.booking_requests set scheduled_at=now()-interval '2 hours' where id='${completedBooking.id}';`,
  );
  await must(
    command(teacher, 'lesson', { id: completedLesson.lessonId, operation: 'request-completion' }),
    'request completion',
  );
  await must(
    command(learner, 'lesson', { id: completedLesson.lessonId, operation: 'confirm-completion' }),
    'confirm completion',
  );
  assert((await balance('regular')) === 11, 'completed lesson consumes one reserved credit');
  assert(
    !!(
      await command(learner, 'lesson', {
        id: completedLesson.lessonId,
        operation: 'confirm-completion',
      })
    ).error,
    'completion cannot be repeated',
  );
  await must(
    command(learner, 'review', { id: completedLesson.lessonId, rating: 5, text: 'Test review' }),
    'eligible review',
  );
  assert(
    !!(
      await command(learner, 'review', {
        id: completedLesson.lessonId,
        rating: 5,
        text: 'Duplicate',
      })
    ).error,
    'one review per completed lesson',
  );
  assert(
    !(await must(teacher.client.rpc('tilawa_snapshot'), 'earnings snapshot')).earnings.length,
    'no fabricated earnings without settlement policy',
  );
  assert(
    !!(
      await learner.client.rpc('tilawa_quran_command', {
        action: 'session.save',
        payload: { chapterNumber: 1, verseNumber: 8 },
      })
    ).error,
    'invalid verse metadata rejected',
  );
  assert(
    !!(
      await learner.client.rpc('tilawa_quran_command', {
        action: 'goal.save',
        payload: { type: 'QURAN_TIME', amount: -1 },
      })
    ).error,
    'invalid goal rejected',
  );
  await must(
    learner.client.rpc('tilawa_quran_command', {
      action: 'bookmark.save',
      payload: { type: 'ayah', key: 2, verseNumber: 10, mushaf: 1, isReading: true },
    }),
    'account reading position',
  );
  const imported = {
    importKey: randomUUID(),
    bookmarks: [{ type: 'ayah', key: 3, verseNumber: 1, mushaf: 1, isReading: true }],
    readingSessions: [],
    pinnedItems: [],
  };
  await must(
    learner.client.rpc('tilawa_quran_command', { action: 'sync.import', payload: imported }),
    'guest merge',
  );
  assert(
    (
      await must(
        learner.client.from('quran_bookmarks').select('*').eq('is_reading', true),
        'reading position',
      )
    ).some((b) => b.key === 2 && b.verse_number === 10),
    'guest merge preserves account reading position',
  );
  await must(
    command(owner, 'admin-settings', { teacherRegistrationEnabled: false }),
    'close teacher registration',
  );
  assert(
    !!(await command(other, 'teacher', { value: teacherDraft('Closed registration') })).error,
    'closed teacher registration rejects new applicants',
  );
  await must(
    command(owner, 'admin-settings', { teacherRegistrationEnabled: true }),
    'restore teacher registration',
  );
  const mature = sql(`with o as (
    insert into public.orders(student_id,teacher_id,kind,subject,amount_cents,terms,status) values('${learner.id}','${teacher.id}','teacher','arabic',9000,'{}','paid') returning id
  ), p as (
    insert into public.payment_transactions(order_id,status,amount_cents,teacher_net_cents) select id,'paid',9000,7200 from o returning id
  ) insert into public.student_subscriptions(student_id,kind,teacher_id,payment_id,subject,included_lessons,duration_minutes,price_cents,starts_at,ends_at,access_ends_at)
  select '${learner.id}','teacher','${teacher.id}',id,'arabic',8,45,9000,now()-interval '36 days',now()-interval '6 days',now()-interval '1 day' from p returning id,payment_id;`)[0];
  sql(
    `insert into public.earnings_transactions(teacher_id,subscription_id,payment_id,amount_cents,status,event_key) values('${
      teacher.id
    }','${mature.id}','${mature.payment_id}',7200,'available','test:${randomUUID()}');`,
  );
  const withdrawals = await Promise.all([
    command(teacher, 'withdrawal', { amountCents: 4000, method: 'bank' }),
    command(teacher, 'withdrawal', { amountCents: 4000, method: 'bank' }),
  ]);
  assert(
    withdrawals.filter((result) => !result.error).length === 1,
    'concurrent withdrawals cannot overdraw verified balance',
  );
  assert(
    (await must(teacher.client.from('withdrawal_requests').select('*'), 'withdrawal list'))
      .length === 1,
    'only one withdrawal request persisted',
  );
  await must(
    command(teacher2, 'availability', {
      zone: 'America/New_York',
      value: [{ day: 0, start: '01:30', end: '02:30' }],
    }),
    'DST availability',
  );
  for (const timestamp of ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z']) {
    const delta = Date.parse(timestamp) - Date.now();
    if (delta > 3600000 && delta < 45 * 86400000)
      assert(
        !!(
          await command(learner, 'book', {
            ...base,
            teacherId: teacher2.id,
            scheduledAt: timestamp,
          })
        ).error,
        'ambiguous daylight-saving hour rejected on direct booking',
      );
  }
  await must(
    command(teacher2, 'availability', {
      zone: 'UTC',
      value: [{ day: date.getUTCDay(), start: '15:00', end: '15:20' }],
    }),
    'short availability',
  );
  assert(
    !!(await command(learner, 'book', { ...base, teacherId: teacher2.id })).error,
    'lesson cannot extend beyond availability window',
  );
  await must(
    learner.client.rpc('tilawa_quran_command', {
      action: 'bookmark.save',
      payload: { type: 'page', key: 610, mushaf: 6 },
    }),
    'IndoPak page 610',
  );
  assert(
    !!(
      await learner.client.rpc('tilawa_quran_command', {
        action: 'bookmark.save',
        payload: { type: 'page', key: 549, mushaf: 7 },
      })
    ).error,
    'Mushaf-specific page limits enforced',
  );
  await Promise.all([
    must(
      learner.client.rpc('tilawa_quran_command', {
        action: 'activity.save',
        payload: { mushafId: 1, ranges: ['1:1-1:7'], pageNumbers: [1], seconds: 10 },
      }),
      'reading activity A',
    ),
    must(
      learner.client.rpc('tilawa_quran_command', {
        action: 'activity.save',
        payload: { mushafId: 1, ranges: ['1:3-1:7'], pageNumbers: [1], seconds: 10 },
      }),
      'reading activity B',
    ),
  ]);
  const activity = await must(
    learner.client.from('quran_activity_days').select('*'),
    'reading activity',
  );
  assert(
    activity[0].pages_read === 1 && activity[0].seconds_read === 20,
    'concurrent overlapping reading counts a page once',
  );
  const avatarPath = `${learner.id}/${randomUUID()}.png`;
  await must(
    learner.client.storage
      .from('tilawa-avatars')
      .upload(avatarPath, readFileSync('public/tilawa/app_icon.png'), { contentType: 'image/png' }),
    'avatar upload',
  );
  uploadedFiles.push({ bucket: 'tilawa-avatars', path: avatarPath });
  assert(
    !!(await teacher2.client.storage.from('tilawa-avatars').createSignedUrl(avatarPath, 30)).error,
    'unrelated account cannot sign a private student avatar',
  );
  const documentPath = `${teacher.id}/${randomUUID()}.png`;
  await must(
    teacher.client.storage
      .from('tilawa-teacher-documents')
      .upload(documentPath, readFileSync('public/tilawa/app_icon.png'), {
        contentType: 'image/png',
      }),
    'teacher document upload',
  );
  uploadedFiles.push({ bucket: 'tilawa-teacher-documents', path: documentPath });
  await must(
    command(teacher, 'document', { path: documentPath, label: '[TEST] qualification' }),
    'teacher document metadata',
  );
  assert(
    !!(
      await learner.client.storage
        .from('tilawa-teacher-documents')
        .createSignedUrl(documentPath, 30)
    ).error,
    'student cannot read teacher application documents',
  );
  assert(
    !!(
      await owner.client.storage.from('tilawa-teacher-documents').createSignedUrl(documentPath, 30)
    ).data?.signedUrl,
    'admin can review private teacher documents',
  );
  if (process.argv.includes('--browser')) {
    const { browserSmoke } = await import('./browser-smoke.mjs');
    await browserSmoke({ student: learner, teacher, owner, assert });
  }
  process.stdout.write(`Completed ${checks} live assertions.\n`);
} finally {
  for (const file of uploadedFiles)
    await must(admin.storage.from(file.bucket).remove([file.path]), 'remove test upload');
  if (people.length) {
    const ids = people.map((p) => `'${p.id}'`).join(',');
    sql(`begin;
      delete from public.coupon_redemptions where coupon_id in(select id from public.teacher_discount_coupons where teacher_id in(${ids}));
      delete from public.reviews where student_id in(${ids}) or teacher_id in(${ids});
      delete from public.lesson_events where lesson_id in(select id from public.lessons where student_id in(${ids}) or teacher_id in(${ids}));
      delete from public.lesson_completion_requests where lesson_id in(select id from public.lessons where student_id in(${ids}) or teacher_id in(${ids}));
      delete from public.lesson_cancellation_requests where lesson_id in(select id from public.lessons where student_id in(${ids}) or teacher_id in(${ids}));
      delete from public.subscription_credit_ledger where subscription_id in(select id from public.student_subscriptions where student_id in(${ids}) or teacher_id in(${ids}));
      delete from public.earnings_transactions where teacher_id in(${ids});
      delete from public.withdrawal_requests where teacher_id in(${ids});
      delete from public.lessons where student_id in(${ids}) or teacher_id in(${ids});
      delete from public.booking_requests where student_id in(${ids}) or teacher_id in(${ids});
      delete from public.student_subscriptions where student_id in(${ids}) or teacher_id in(${ids});
      delete from public.payment_events where payment_id in(select id from public.payment_transactions where order_id in(select id from public.orders where student_id in(${ids}) or teacher_id in(${ids})));
      delete from public.payment_transactions where order_id in(select id from public.orders where student_id in(${ids}) or teacher_id in(${ids}));
      delete from public.orders where student_id in(${ids}) or teacher_id in(${ids});
      delete from public.direct_conversation_user_states where conversation_id in(select id from public.direct_conversations where student_id in(${ids}) or teacher_id in(${ids}));
      delete from public.direct_messages where conversation_id in(select id from public.direct_conversations where student_id in(${ids}) or teacher_id in(${ids}));
      delete from public.direct_conversations where student_id in(${ids}) or teacher_id in(${ids});
      delete from public.teacher_documents where teacher_id in(${ids});
      delete from public.teacher_approval_events where teacher_id in(${ids});
      delete from public.teacher_qualifications where teacher_id in(${ids});
      delete from public.teacher_private_contacts where teacher_id in(${ids});
      delete from public.teacher_offers where teacher_id in(${ids});
      delete from public.teacher_availability where teacher_id in(${ids});
      delete from public.teacher_discount_coupons where teacher_id in(${ids});
      delete from public.teacher_profiles where user_id in(${ids});
      delete from public.admin_audit_logs where actor_id in(${ids}) or target_id in(${ids});
      commit; select true as cleaned;`);
    for (const person of people)
      await must(admin.auth.admin.deleteUser(person.id), 'delete test account');
    process.stdout.write('Temporary test users and related rows removed.\n');
  }
}
