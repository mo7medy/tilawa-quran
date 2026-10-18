/* eslint-disable react/no-multi-comp -- A small mode wrapper selects the colocated live or isolated design-preview component. */
import { useEffect, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';

import { createAccountFixtures } from '../../tilawa/account/fixtures';
import { accountPreviewReducer } from '../../tilawa/account/reducer';
import type { PreviewAction } from '../../tilawa/account/types';

import { AccountContext } from './AccountContext';
import type { LiveAction } from './AccountContext';
import LiveAccountProvider from './LiveAccountProvider';

export { useAccountPreview, useOptionalAccountPreview } from './AccountContext';
export type { LiveAction } from './AccountContext';

const DemoAccountProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [state, dispatch] = useReducer(accountPreviewReducer, undefined, createAccountFixtures);
  useEffect(() => {
    dispatch({ type: 'reset', now: new Date().toISOString() });
  }, []);
  const value = useMemo(
    () => ({ state, dispatch: dispatch as Dispatch<PreviewAction | LiveAction> }),
    [state],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};
const AccountPreviewProvider = ({ children }: { children: ReactNode }): JSX.Element =>
  process.env.NODE_ENV === 'test' ||
  (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_TILAWA_DEMO === '1') ? (
    <DemoAccountProvider>{children}</DemoAccountProvider>
  ) : (
    <LiveAccountProvider>{children}</LiveAccountProvider>
  );
export default AccountPreviewProvider;
