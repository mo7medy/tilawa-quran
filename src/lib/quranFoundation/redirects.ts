import { QuranFoundationError } from './config';

/** Reject upstream redirects without forwarding credentials or exposing their response body. */
const rejectFoundationRedirect = async (
  response: Response,
  endpoint: 'token endpoint' | 'API',
): Promise<void> => {
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new QuranFoundationError(`Quran Foundation ${endpoint} redirects are not allowed.`);
  }
};

export default rejectFoundationRedirect;
