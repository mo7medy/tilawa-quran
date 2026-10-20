/* eslint-disable import/order -- Register shared router and translation mocks first. */
/* eslint-disable @typescript-eslint/naming-convention -- Fixtures use the existing database response contract. */
/* eslint-disable react-func/max-lines-per-function -- Keep the related administration test suite together. */
/* eslint-disable max-lines -- Exercise access, decisions, navigation and deferred sections in one focused suite. */
import React from 'react';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accountTestRoute } from '../Account/accountTestSetup';
import { AccountContext } from '../Account/AccountContext';
import AdminAccount from '../Account/AdminAccount';
import { overviewTestReport, financeTestReport } from './adminReportTestData';

import { createAccountFixtures } from '@/tilawa/account/fixtures';
import { ADMIN_SECTIONS, getAdminSection, isAdminRoutePathname } from '@/tilawa/adminSections';
import { tilawaFetch } from '@/tilawa/backend/http';

vi.mock('@/tilawa/backend/http', () => ({ tilawaFetch: vi.fn() }));
vi.mock('@/lib/supabase/browser', () => ({
  getSessionUserId: () => 'admin-1',
  getBrowserSupabase: () => ({
    auth: { mfa: { listFactors: async () => ({ data: { totp: [] } }) } },
  }),
}));

const response = {
  teachers: [
    {
      user_id: 'teacher-1',
      display_name: 'Pending teacher',
      email: 'pending@example.test',
      approval: 'pending',
      country: 'EG',
      documents: [],
      events: [],
    },
    {
      user_id: 'teacher-2',
      display_name: 'Approved teacher',
      email: 'approved@example.test',
      approval: 'approved',
      documents: [],
      events: [],
    },
  ],
  settings: { teacher_registration_enabled: true },
  audit: [{ id: 'event-1234567890', action: 'admin-settings', created_at: '2026-10-19T12:00:00Z' }],
};
const command = vi.fn(async (action: string, payload: unknown) => ({ ok: !!action && !!payload }));

const mount = (
  section: string[] = [],
  allowed = true,
  userId: string | undefined = 'admin-1',
  locale = 'en',
) => {
  Object.assign(accountTestRoute, {
    pathname: '/1x2003/admin/[[...section]]',
    asPath: `/1x2003/admin/${section.join('/')}`,
    query: { section },
    locale,
  });
  return render(
    <SWRConfig
      value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}
    >
      <AccountContext.Provider
        value={{
          state: createAccountFixtures(),
          dispatch: vi.fn(),
          backend: true,
          userId,
          snapshot: { isAdmin: allowed, adminVerified: allowed, settings: response.settings },
          command: async <T,>(action: string, payload: unknown) => command(action, payload) as T,
        }}
      >
        <AdminAccount />
      </AccountContext.Provider>
    </SWRConfig>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tilawaFetch).mockImplementation(async <T,>(path: string) => {
    if (path.startsWith('admin/reports/overview')) return structuredClone(overviewTestReport) as T;
    if (path.startsWith('admin/reports/finance')) return structuredClone(financeTestReport) as T;
    if (path.startsWith('admin/teacher/')) {
      return structuredClone(
        response.teachers.find((teacher) => path.endsWith(teacher.user_id)) ?? null,
      ) as T;
    }
    if (path.startsWith('admin/lists/teachers')) {
      const params = new URL(path, 'https://test.invalid').searchParams;
      const items = response.teachers
        .filter(
          (teacher) =>
            (params.get('status') === 'all' || teacher.approval === params.get('status')) &&
            `${teacher.display_name} ${teacher.email}`
              .toLowerCase()
              .includes((params.get('search') ?? '').toLowerCase()),
        )
        .map((teacher) => ({
          id: teacher.user_id,
          name: teacher.display_name,
          status: teacher.approval,
          country: teacher.country,
        }));
      return { items, total: items.length } as T;
    }
    if (path.startsWith('admin/lists/audit')) {
      return {
        items: response.audit.map((event) => ({
          ...event,
          name: 'Administrator',
          status: event.action,
          target: 'event-123456',
        })),
        total: 1,
      } as T;
    }
    if (path.startsWith('admin/lists/')) return { items: [], total: 0 } as T;
    if (path === 'admin/health') return { readsReady: true, maintenance: null } as T;
    return structuredClone(response) as T;
  });
});
afterEach(cleanup);

describe('Website administration', () => {
  it('isolates only the admin route family and resolves the eight sections', () => {
    expect(ADMIN_SECTIONS).toHaveLength(8);
    expect(getAdminSection()).toBe('overview');
    expect(getAdminSection('wallet')).toBeNull();
    expect(isAdminRoutePathname('/1x2003/admin')).toBe(true);
    expect(isAdminRoutePathname('/admin')).toBe(false);
    expect(isAdminRoutePathname('/admin/teachers')).toBe(false);
    expect(isAdminRoutePathname('/1x2003/administrator')).toBe(false);
    expect(isAdminRoutePathname('/1x2003/admin/[[...section]]')).toBe(true);
    expect(isAdminRoutePathname('/administrator')).toBe(false);
    expect(isAdminRoutePathname('/22')).toBe(false);
  });
  it('shows a pending review queue and exactly eight navigation links', async () => {
    mount();
    await screen.findByText('Pending teacher');
    expect(screen.queryByText('Approved teacher')).toBeNull();
    const navigation = screen.getByRole('navigation');
    expect(within(navigation).getAllByRole('link')).toHaveLength(8);
    within(navigation)
      .getAllByRole('link')
      .forEach((link) => {
        expect(link.getAttribute('href')).toMatch(/^\/1x2003\/admin(?:\/|$)/);
      });
    expect(
      within(navigation).getByRole('link', { name: 'Overview' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(within(navigation).queryByText(/support|wallet|rooms/i)).toBeNull();
  });
  it('filters teachers by approval and searches their email', async () => {
    mount(['teachers']);
    await screen.findByText('Pending teacher');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'all' } });
    await screen.findByText('Approved teacher');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'APPROVED@example.test' } });
    await waitFor(() => expect(screen.queryByText('Pending teacher')).toBeNull());
    await screen.findByText('Approved teacher');
  });
  it('closes the mobile navigation with Escape from a navigation link', async () => {
    mount();
    await screen.findByText('Pending teacher');
    fireEvent.click(screen.getByRole('button', { name: 'Open administration menu' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(within(dialog).getByRole('link', { name: 'Teachers' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('keeps teacher decisions on the existing command contract', async () => {
    mount(['teachers', 'teacher-1']);
    const approve = await screen.findByRole('button', { name: 'Approve teacher' });
    fireEvent.click(approve);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('admin-teacher', {
        id: 'teacher-1',
        approval: 'approved',
        reason: '',
        academyEnabled: false,
      }),
    );
    const reject = screen.getByRole('button', { name: 'Reject / withdraw approval' });
    expect((reject as HTMLButtonElement).disabled).toBe(true);
  });
  it('keeps teacher registration settings and distinguishes unfinished security setup', async () => {
    mount(['settings']);
    const toggle = await screen.findByRole('checkbox');
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(command).toHaveBeenCalledWith('admin-settings', { teacherRegistrationEnabled: false }),
    );
    expect(screen.getByText(/Administrator data and actions require/)).toBeDefined();
  });
  it('shows actual audit entries on their own page', async () => {
    mount(['audit']);
    await screen.findByText('event-123456');
    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.queryByText('Pending teacher')).toBeNull();
  });
  it('reuses the USD catalogue without offering manual activation', async () => {
    mount(['subscriptions']);
    await screen.findByText('$80');
    expect(screen.getByText('$100')).toBeDefined();
    expect(screen.getByText('$120')).toBeDefined();
    expect(screen.getAllByText(/45/)).toHaveLength(3);
    expect(screen.getAllByText(/recitation correction or Quran memorization/i)).toHaveLength(2);
    expect(command).not.toHaveBeenCalled();
  });
  it.each(['students', 'lessons'])(
    'loads %s through the secured live directory',
    async (section) => {
      mount([section]);
      await screen.findByText('No matching records.');
      expect(screen.getByRole('table')).toBeDefined();
      expect(command).not.toHaveBeenCalled();
    },
  );
  it('does not fetch administrative data or expose navigation to non-admins', async () => {
    mount([], false);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(tilawaFetch).not.toHaveBeenCalled();
    expect(screen.getByText(/authorized administrators/i)).toBeDefined();
  });
  it('does not fetch administrative data without a signed-in user', () => {
    mount([], true, '');
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(tilawaFetch).not.toHaveBeenCalled();
  });
  it('shows report values and a daily table, with explicit date controls', async () => {
    mount();
    await screen.findByText('Current operational snapshot');
    expect(screen.getByText('18')).toBeDefined();
    fireEvent.click(screen.getByText('Show daily figures'));
    expect(screen.getByRole('table')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Reporting period'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-05' } });
    fireEvent.change(screen.getByLabelText('Through'), { target: { value: '2026-02-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply dates' }));
    expect(screen.getByRole('alert')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Through'), { target: { value: '2026-02-07' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply dates' }));
    await waitFor(() =>
      expect(
        vi
          .mocked(tilawaFetch)
          .mock.calls.some(([path]) => path.includes('from=2026-02-05&until=2026-02-08')),
      ).toBe(true),
    );
  });
  it('shows finance in USD without financial write actions or a fabricated commission', async () => {
    mount(['finance']);
    await screen.findByText('Payments currently marked paid');
    expect(screen.getByText('$200.00')).toBeDefined();
    expect(screen.getByText('Not defined')).toBeDefined();
    expect(screen.getByText('[Preview] Student')).toBeDefined();
    expect(screen.queryByRole('button', { name: /approve|transfer|refund/i })).toBeNull();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } });
    await waitFor(() =>
      expect(
        vi.mocked(tilawaFetch).mock.calls.some(([path]) => path.includes('status=failed')),
      ).toBe(true),
    );
    expect(command).not.toHaveBeenCalled();
  });
  it('shows report failures instead of substituting zero financial totals', async () => {
    vi.mocked(tilawaFetch).mockImplementation(async <T,>(path: string) => {
      if (path.startsWith('admin/reports/finance')) throw new Error('Unavailable');
      if (path.startsWith('admin/teacher/')) {
        return structuredClone(
          response.teachers.find((teacher) => path.endsWith(teacher.user_id)) ?? null,
        ) as T;
      }
      if (path.startsWith('admin/lists/teachers')) {
        const params = new URL(path, 'https://test.invalid').searchParams;
        const items = response.teachers
          .filter(
            (teacher) =>
              (params.get('status') === 'all' || teacher.approval === params.get('status')) &&
              `${teacher.display_name} ${teacher.email}`
                .toLowerCase()
                .includes((params.get('search') ?? '').toLowerCase()),
          )
          .map((teacher) => ({
            id: teacher.user_id,
            name: teacher.display_name,
            status: teacher.approval,
            country: teacher.country,
          }));
        return { items, total: items.length } as T;
      }
      if (path.startsWith('admin/lists/audit')) {
        return {
          items: response.audit.map((event) => ({
            ...event,
            name: 'Administrator',
            status: event.action,
            target: 'event-123456',
          })),
          total: 1,
        } as T;
      }
      if (path.startsWith('admin/lists/')) return { items: [], total: 0 } as T;
      if (path === 'admin/health') return { readsReady: true, maintenance: null } as T;
      return structuredClone(response) as T;
    });
    mount(['finance']);
    await screen.findByText(
      'Reports could not be loaded. Check the connection and that the reporting migration has been applied.',
    );
    expect(screen.queryByText('$0.00')).toBeNull();
  });
  it('renders the Arabic navigation and RTL layout', async () => {
    mount([], true, 'admin-1', 'ar');
    await screen.findByText('Pending teacher');
    expect(screen.getByRole('main').closest('[dir]')?.getAttribute('dir')).toBe('rtl');
    expect(
      within(screen.getByRole('navigation')).getByRole('link', { name: 'المعلمون' }),
    ).toBeDefined();
  });
  it('reports a failed snapshot and allows retry without stale fake content', async () => {
    vi.mocked(tilawaFetch).mockRejectedValueOnce(new Error('Offline'));
    mount();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Pending teacher');
  });
});
