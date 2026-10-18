import { createContext, useContext } from 'react';

import type { AccountPreviewState, PreviewAction } from '@/tilawa/account/types';

export interface LiveAction {
  type: string;
  [key: string]: unknown;
}

interface AccountPreviewContextValue {
  state: AccountPreviewState;
  dispatch: (action: PreviewAction | LiveAction) => void | Promise<boolean>;
  backend?: boolean;
  loading?: boolean;
  busy?: boolean;
  error?: string;
  userId?: string;
  snapshot?: Record<string, unknown>;
  refresh?: () => Promise<unknown>;
  command?: <T = { id?: string; ok?: boolean }>(action: string, payload: unknown) => Promise<T>;
  logout?: () => Promise<void>;
}
export const AccountContext = createContext<AccountPreviewContextValue | null>(null);
export const useOptionalAccountPreview = (): AccountPreviewContextValue | null =>
  useContext(AccountContext);
export const useAccountPreview = (): AccountPreviewContextValue => {
  const context = useContext(AccountContext);
  if (!context) throw new Error('AccountPreviewProvider is required');
  return context;
};
