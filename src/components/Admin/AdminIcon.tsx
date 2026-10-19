import type { AdminSection } from '@/tilawa/adminSections';

const paths: Record<AdminSection, string> = {
  overview: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  teachers: 'm2 8 10-5 10 5-10 5L2 8Zm4 2v6c4 3 8 3 12 0v-6M22 8v7',
  students:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm11 10v-2a4 4 0 0 0-3-4M16 3a4 4 0 0 1 0 8',
  lessons:
    'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 10h3M8 17h6',
  subscriptions: 'M3 5h18v15H3zM3 10h18M7 15h4',
  finance: 'M3 5h18v15H3zM3 10h18M7 15h4M16 14v3M14.5 15.5h3',
  audit: 'M6 3h12v18H6zM9 7h6M9 11h6M9 15h4',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
};

const AdminIcon = ({ name }: { name: AdminSection }): JSX.Element => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={paths[name]} />
  </svg>
);
export default AdminIcon;
