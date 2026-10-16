import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const subscribe = (onChange: () => void): (() => void) => {
  if (!window.matchMedia) return () => undefined;
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getSnapshot = (): boolean => window.matchMedia?.(MOBILE_QUERY).matches ?? false;
const getServerSnapshot = (): boolean => false;

// Hydrate the same desktop structure as SSR, then adapt to the real viewport.
const useIsMobile = (): boolean => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export default useIsMobile;
