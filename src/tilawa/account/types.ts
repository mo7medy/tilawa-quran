/* eslint-disable max-lines -- Keep this cohesive form or typed data contract together; reader services are split by feature. */
import type { AcademyGift, AcademySubject } from '../academyPlans';
import type { AcademyTeacherProfile } from '../teachers';

export type AccountRole = 'student' | 'teacher';
export type ApprovalStatus = 'incomplete' | 'pending' | 'approved' | 'rejected';
export interface StudentAccount {
  id: string;
  name: string;
  country: string;
  birthDate: string;
  goal: string;
  schedule: string;
  email: string;
  zone: string;
  photo: string;
  avatarPath?: string;
}
export interface TeacherAccount {
  publicProfile: AcademyTeacherProfile;
  email: string;
  country: string;
  experience: number;
  phone: string;
  approval: ApprovalStatus;
  pricing: 'perLesson' | 'monthly' | 'both';
  monthlyPriceCents: number;
  monthlyLessons: number;
  avatarPath?: string;
}
export interface Lesson {
  id: string;
  studentId: string;
  teacherId: string;
  subject: AcademySubject;
  scheduledAt: string;
  duration: number;
  type: 'intro' | 'regular' | 'subscription';
  status: 'upcoming' | 'completed' | 'cancelled';
  paid: boolean;
  completion: 'none' | 'pending' | 'rejected';
  cancellation: 'none' | 'pending' | 'rejected';
  requestedBy?: AccountRole;
  history: string[];
  review?: { rating: number; text: string };
  fundingSource?: string;
  paymentState?: string;
  meetingUrl?: string;
}
export interface BookingRequest {
  id: string;
  studentId: string;
  teacherId: string;
  type: Lesson['type'];
  scheduledAt: string;
  duration: number;
  subject: AcademySubject;
  amountCents: number;
  paid: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  note: string;
  lessonId?: string;
}
export interface AccountSubscription {
  id: string;
  kind: 'academy' | 'teacher';
  planId: 'essential' | 'progress' | 'immersive';
  teacherId?: string;
  subject: AcademySubject;
  used: number;
  gift: AcademyGift;
  giftUsed: boolean;
  giftChosen?: boolean;
  giftReserved?: boolean;
  startsAt: string;
  renewsAt: string;
  includedLessons?: number;
  remainingLessons?: number;
  reservedLessons?: number;
  priceCents?: number;
  durationMinutes?: number;
  expiresAt?: string;
  status?: string;
}
export interface AvailabilitySlot {
  id: string;
  day: number;
  start: string;
  end: string;
}
export interface Coupon {
  id: string;
  code: string;
  percent: number;
  limit: number;
  active: boolean;
  expires: string;
}
export interface Message {
  id: string;
  role: AccountRole;
  text: string;
  conversationId?: string;
  senderId?: string;
  createdAt?: string;
}
export interface Withdrawal {
  id: string;
  amountCents: number;
  method: string;
  status: 'pending' | 'paid' | 'rejected';
}
export interface AccountPreviewState {
  revision: number;
  student: StudentAccount;
  teacher: TeacherAccount;
  lessons: Lesson[];
  requests: BookingRequest[];
  subscriptions: AccountSubscription[];
  availability: AvailabilitySlot[];
  availabilityZone: string;
  coupons: Coupon[];
  messages: Message[];
  withdrawals: Withdrawal[];
  teachers?: TeacherAccount[];
  students?: StudentAccount[];
  availableCents?: number;
  pendingCents?: number;
}
export type PreviewAction =
  | { type: 'reset'; now?: string }
  | { type: 'scenario'; approval: ApprovalStatus }
  | { type: 'student'; value: StudentAccount }
  | { type: 'teacher'; value: TeacherAccount }
  | { type: 'request'; id: string; accept: boolean }
  | {
      type: 'lesson';
      id: string;
      role: AccountRole;
      operation:
        | 'reschedule'
        | 'cancel'
        | 'request-completion'
        | 'confirm-completion'
        | 'reject-completion'
        | 'confirm-cancellation'
        | 'reject-cancellation';
      at?: string;
      now: string;
    }
  | { type: 'review'; id: string; rating: number; text: string }
  | { type: 'gift'; id: string; gift: AcademyGift }
  | { type: 'availability'; value: AvailabilitySlot[]; zone: string }
  | { type: 'coupon'; value: Coupon }
  | { type: 'message'; role: AccountRole; text: string }
  | { type: 'withdrawal'; amountCents: number; method: string };
