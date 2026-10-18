/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/** Separate guest Quran data from every authenticated account on shared devices. */
type Snapshot = Record<string, unknown>;
const OWNER = 'tilawa-private-owner';
const GUEST = 'tilawa-guest-quran';
const KEYS = ['bookmarks', 'readingTracker', 'pinnedVerses', 'guestBookmark'];
let store: {
  getState: () => Snapshot;
  dispatch: (action: { type: string; payload: Snapshot }) => unknown;
} | null = null;
const readJson = (key: string): Snapshot => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') as Snapshot;
  } catch {
    return {};
  }
};
const pick = (state: Snapshot): Snapshot =>
  Object.fromEntries(
    KEYS.filter((key) => state[key] !== undefined).map((key) => [key, state[key]]),
  );
export const registerPrivateStore = (next: typeof store): void => {
  store = next;
};
export const guestQuranSnapshot = (): Snapshot =>
  typeof window === 'undefined' ? {} : readJson(GUEST);
export const guestImportChoice = (id: string): string | null =>
  localStorage.getItem(`tilawa-guest-choice:${id}`);
export const setGuestImportChoice = (id: string, choice: string): void => {
  localStorage.setItem(`tilawa-guest-choice:${id}`, choice);
  window.dispatchEvent(new Event('tilawa-guest-choice'));
};
export const switchPrivateOwner = (id: string | null): boolean => {
  if (typeof window === 'undefined') return false;
  const previous = localStorage.getItem(OWNER);
  if (previous === id) return false;
  const persisted = readJson('persist:root');
  if (!previous && id) {
    const guest = store
      ? pick(store.getState())
      : Object.fromEntries(
          KEYS.filter((key) => typeof persisted[key] === 'string').map((key) => {
            try {
              return [key, JSON.parse(String(persisted[key]))];
            } catch {
              return [key, undefined];
            }
          }),
        );
    localStorage.setItem(
      GUEST,
      JSON.stringify({
        ...guest,
        quranReaderStyles:
          store?.getState().quranReaderStyles ??
          (typeof persisted.quranReaderStyles === 'string'
            ? JSON.parse(persisted.quranReaderStyles)
            : {}),
      }),
    );
  }
  const replacement = id ? {} : guestQuranSnapshot();
  KEYS.forEach((key) => {
    if (replacement[key] !== undefined) persisted[key] = JSON.stringify(replacement[key]);
    else delete persisted[key];
  });
  if (Object.keys(persisted).length) {
    localStorage.setItem('persist:root', JSON.stringify(persisted));
  }
  if (id) localStorage.setItem(OWNER, id);
  else localStorage.removeItem(OWNER);
  store?.dispatch({ type: 'tilawa/private-reset', payload: replacement });
  window.dispatchEvent(new Event('tilawa-account-cleared'));
  return true;
};

/** Hide persisted private slices before auth resolves; server data will hydrate the verified account. */
export const hideUnverifiedPrivateCache = (): void => {
  if (typeof window === 'undefined' || !localStorage.getItem(OWNER)) return;
  const persisted = readJson('persist:root');
  KEYS.forEach((key) => {
    delete persisted[key];
  });
  localStorage.setItem('persist:root', JSON.stringify(persisted));
};
