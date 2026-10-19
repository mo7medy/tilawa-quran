/* eslint-disable import/prefer-default-export -- Named download helper. */
/* eslint-disable @typescript-eslint/naming-convention -- HTTP identity header contract. */
import { getSessionUserId } from '@/lib/supabase/browser';
import { TilawaRequestError } from '@/tilawa/backend/http';

export const downloadFinance = async (path: string, userId: string): Promise<void> => {
  const response = await fetch(`/api/tilawa/v1/${path}&format=csv`, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-Tilawa-User': userId },
  });
  if (!response.ok) {
    const result = await response.json();
    throw new TilawaRequestError(result.error?.code ?? 'BACKEND_ERROR', response.status);
  }
  const blob = await response.blob();
  if (getSessionUserId() !== userId) throw new TilawaRequestError('ACCOUNT_CHANGED', 409);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tilawa-payments-usd.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
