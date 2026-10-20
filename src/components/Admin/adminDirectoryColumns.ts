export const COLUMNS: Record<string, string[]> = {
  students: ['name', 'country', 'status', 'created_at'],
  lessons: ['student', 'teacher', 'subject', 'type', 'created_at', 'duration', 'status'],
  subscriptions: [
    'student',
    'teacher',
    'kind',
    'package',
    'subject',
    'credits',
    'ends_at',
    'status',
  ],
  audit: ['action', 'name', 'target', 'created_at'],
};
export const STATUSES: Record<string, string[]> = {
  students: ['active', 'disabled'],
  lessons: ['scheduled', 'completed', 'cancelled'],
  subscriptions: ['active', 'expired', 'cancelled'],
  audit: ['admin-teacher', 'admin-settings'],
};
