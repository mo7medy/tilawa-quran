/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
/* eslint-disable @typescript-eslint/naming-convention -- Preserve existing database, HTTP and translation-key contracts at the boundary. */
import type { AccountPreviewState, StudentAccount } from '../account/types';

import { mapLesson } from './lessonMapper';
import { object, rows, string } from './rows';
import type { Row } from './rows';
import { mapSubscription } from './subscriptionMapper';
import { mapTeacherAccount } from './teacherMapper';

export const emptyAccount = (): AccountPreviewState => ({
  revision: 0,
  student: {
    id: '',
    name: '',
    country: '',
    birthDate: '',
    goal: '',
    schedule: '',
    email: '',
    zone: 'UTC',
    photo: '',
  },
  teacher: mapTeacherAccount({}),
  lessons: [],
  requests: [],
  subscriptions: [],
  availability: [],
  availabilityZone: 'UTC',
  coupons: [],
  messages: [],
  withdrawals: [],
  teachers: [],
  students: [],
  availableCents: 0,
  pendingCents: 0,
});
export const mapAccountSnapshot = (value: Row): AccountPreviewState => {
  const profile = object(value.profile);
  const student = object(value.student);
  const selfId = string(profile.id);
  const teachers = rows(value.teachers).map((t) =>
    mapTeacherAccount(
      t,
      t.user_id === selfId ? string(value.email) : '',
      t.user_id === selfId ? string(object(value.contacts).phone) : '',
    ),
  );
  const ownStudent: StudentAccount = {
    id: selfId,
    name: string(profile.display_name),
    country: string(profile.country),
    zone: string(profile.time_zone) || 'UTC',
    birthDate: string(student.birth_date),
    goal: string(student.learning_goal),
    schedule: string(student.preferred_schedule),
    email: string(value.email),
    photo: string(profile.avatar_url),
    avatarPath: string(profile.avatar_path),
  };
  const students = rows(value.people).map(
    (p): StudentAccount =>
      p.id === selfId
        ? ownStudent
        : {
            id: string(p.id),
            name: string(p.display_name),
            country: string(p.country),
            zone: string(p.time_zone) || 'UTC',
            goal: string(p.learning_goal),
            schedule: string(p.preferred_schedule),
            birthDate: '',
            email: '',
            photo: string(p.avatar_url),
            avatarPath: string(p.avatar_path),
          },
  );
  const lessons = rows(value.lessons).map(mapLesson);
  const withdrawals = rows(value.withdrawals).map((w) => ({
    id: string(w.id),
    amountCents: Number(w.amount_cents),
    method: string(w.method),
    status:
      w.status === 'approved'
        ? ('pending' as const)
        : (w.status as 'pending' | 'paid' | 'rejected'),
  }));
  const credits = rows(value.credits);
  return {
    revision: Date.parse(string(profile.updated_at)) || 0,
    student: ownStudent,
    teacher:
      teachers.find((t) => t.publicProfile.id === selfId) ??
      mapTeacherAccount(
        { user_id: selfId, display_name: profile.display_name, country: profile.country },
        string(value.email),
      ),
    teachers,
    students,
    lessons,
    requests: rows(value.requests).map((b) => ({
      id: string(b.id),
      studentId: string(b.student_id),
      teacherId: string(b.teacher_id),
      subject: b.subject === 'arabic' ? 'arabic' : 'quran',
      type: b.lesson_type === 'intro' ? 'intro' : b.subscription_id ? 'subscription' : 'regular',
      scheduledAt: string(b.scheduled_at),
      duration: Number(b.duration_minutes),
      amountCents: Number(b.amount_cents),
      paid: b.payment_status !== 'unpaid',
      status: b.status as 'pending' | 'accepted' | 'rejected',
      note: string(b.note),
      lessonId:
        string(b.lesson_id) || string(rows(value.lessons).find((l) => l.booking_id === b.id)?.id),
    })),
    subscriptions: rows(value.subscriptions)
      .filter((s) => s.student_id === selfId)
      .map((s) => mapSubscription(s, credits)),
    availability: rows(value.availability).map((a) => ({
      id: string(a.id),
      day: Number(a.weekday),
      start: string(a.start_time).slice(0, 5),
      end: string(a.end_time).slice(0, 5),
    })),
    availabilityZone: string(profile.time_zone) || 'UTC',
    coupons: rows(value.coupons).map((c) => ({
      id: string(c.id),
      code: string(c.code),
      percent: Number(c.percent),
      limit: Number(c.usage_limit),
      active: !!c.active,
      expires: c.expires_at ? new Date(String(c.expires_at)).toISOString().slice(0, 10) : '',
    })),
    messages: rows(value.messages).map((m) => ({
      id: string(m.id),
      text: string(m.body),
      role:
        rows(value.conversations).find((c) => c.id === m.conversation_id)?.teacher_id ===
        m.sender_id
          ? 'teacher'
          : 'student',
      senderId: string(m.sender_id),
      conversationId: string(m.conversation_id),
      createdAt: string(m.created_at),
    })),
    withdrawals,
    availableCents:
      typeof object(value.balances).available === 'number'
        ? Number(object(value.balances).available)
        : Math.max(
            0,
            rows(value.earnings)
              .filter((e) => e.status === 'available')
              .reduce((sum, e) => sum + Number(e.amount_cents), 0) -
              withdrawals
                .filter((w) => w.status !== 'rejected')
                .reduce((sum, w) => sum + w.amountCents, 0),
          ),
    pendingCents:
      typeof object(value.balances).pending === 'number'
        ? Number(object(value.balances).pending)
        : rows(value.earnings)
            .filter((e) => e.status === 'pending')
            .reduce((sum, e) => sum + Number(e.amount_cents), 0),
  };
};
