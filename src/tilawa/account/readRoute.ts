import { stripLocalePrefix } from '@/utils/tilawaRoutes';

export interface AccountReadRoute {
  view: string;
  id: string;
  page: number;
  status: string;
}
export const accountReadRoute = (
  asPath: string,
  locales: readonly string[] = ['en', 'ar'],
): AccountReadRoute | null => {
  const url = new URL(asPath, 'https://local.invalid');
  const path = stripLocalePrefix(url.pathname, locales).split('/').filter(Boolean);
  const page = Math.max(1, Math.min(100000, Number(url.searchParams.get('accountPage')) || 1));
  if (path[0] === 'lessons') return { view: 'lesson', id: path[1] ?? '', page, status: 'all' };
  if (path[0] !== 'profile' && !(path[0] === 'dashboard' && path[1] === 'teacher')) return null;
  const section =
    path[path[0] === 'profile' ? 1 : 2] ?? (path[0] === 'profile' ? 'profile' : 'dashboard');
  if (path[0] === 'profile' && section === 'settings') return null;
  const view =
    ({ learning: 'home', student: 'profile', teacher: 'profile' } as Record<string, string>)[
      section
    ] ?? section;
  return {
    view,
    page,
    id:
      view === 'messages'
        ? url.searchParams.get('conversation') ?? ''
        : path[path[0] === 'profile' ? 2 : 3] ?? '',
    status: view === 'lessons' ? url.searchParams.get('lessonStatus') ?? 'scheduled' : 'all',
  };
};
export const accountViewUrl = (route: AccountReadRoute): string => {
  const query = new URLSearchParams({
    view: route.view,
    page: String(route.page),
    status: route.status,
  });
  if (route.id) query.set('id', route.id);
  return `account/view?${query}`;
};
