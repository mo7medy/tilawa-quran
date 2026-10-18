/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
// OAuth and post-login destinations must stay on this website.
export const safeAccountRedirect = (value: unknown, fallback = '/profile'): string =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !/[\\\r\n]/.test(value)
    ? value
    : fallback;
