/* eslint-disable react-func/max-lines-per-function -- Related route protection scenarios share one suite. */
import type { GetServerSidePropsContext } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getServerSideProps as newAdminPage } from '../../pages/1x2003/admin/[[...section]]';
import { getServerSideProps as retiredAdminPage } from '../../pages/admin/[[...section]]';

import { protectAccountPage } from './protectPage';

import { ADMIN_BASE_PATH } from '@/tilawa/adminSections';

const auth = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('./server', () => ({ serverSupabase: () => ({ auth, rpc: auth.rpc }) }));
vi.mock('@/components/Account/AdminAccount', () => ({ default: () => null }));

const context = (resolvedUrl: string, locale = 'en'): GetServerSidePropsContext =>
  ({
    resolvedUrl,
    locale,
    req: { headers: {} },
    res: { setHeader: vi.fn() },
  } as unknown as GetServerSidePropsContext);

beforeEach(() => {
  vi.clearAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: 'signed-in-user' } }, error: null });
  auth.rpc.mockResolvedValue({ data: {}, error: null });
});

describe('Relocated administration page protection', () => {
  it('uses the existing server guard at the new entry', () => {
    expect(newAdminPage).toBe(protectAccountPage);
  });
  it('returns signed-out visitors to the same localized admin section after login', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const target = `/ar${ADMIN_BASE_PATH}/teachers?filter=pending`;
    const request = context(target, 'ar');
    expect(await newAdminPage(request)).toEqual({
      redirect: {
        destination: `/ar/sign-in?redirectTo=${encodeURIComponent(target)}`,
        permanent: false,
      },
    });
    expect(request.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(auth.rpc).not.toHaveBeenCalled();
  });
  it.each(['en', 'ar'])('rejects non-admin members in %s', async (locale) => {
    auth.rpc.mockResolvedValue({ error: { message: 'ADMIN_REQUIRED' } });
    const target = `${locale === 'ar' ? '/ar' : ''}${ADMIN_BASE_PATH}/teachers`;
    expect(await newAdminPage(context(target, locale))).toEqual({ notFound: true });
    expect(auth.rpc).toHaveBeenCalledWith('tilawa_admin_snapshot');
  });
  it('allows a verified administrator after checking membership', async () => {
    expect(await newAdminPage(context(`${ADMIN_BASE_PATH}/settings`))).toEqual({ props: {} });
    expect(auth.getUser).toHaveBeenCalledOnce();
    expect(auth.rpc).toHaveBeenCalledWith('tilawa_admin_snapshot');
  });
  it('does not treat a return URL query on a student page as an admin page', async () => {
    expect(await protectAccountPage(context(`/profile?next=${ADMIN_BASE_PATH}`))).toEqual({
      props: {},
    });
    expect(auth.rpc).not.toHaveBeenCalled();
  });
  it.each(['/admin', '/admin/teachers', '/ar/admin/settings'])(
    'retires %s with a 404 without revealing the new path',
    async (target) => {
      expect(await retiredAdminPage(context(target))).toEqual({ notFound: true });
      expect(auth.getUser).not.toHaveBeenCalled();
      expect(auth.rpc).not.toHaveBeenCalled();
    },
  );
});
