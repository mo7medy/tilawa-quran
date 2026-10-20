/* eslint-disable import/prefer-default-export -- Shared account-switch boundary. */
interface EnumerableCache {
  keys?: () => IterableIterator<string>;
  delete: (key: string) => void;
}
/** SWR 1.x does not support predicate-based mutate. Clear actual serialized keys instead. */
export const clearPrivateSwr = (cache: EnumerableCache, reset: (key: string) => void): void => {
  Array.from(cache.keys?.() ?? []).forEach((key) => {
    if (
      /tilawa-(account|view|messages|admin|slots)|\/api\/tilawa\/|pinned-verses|reading-bookmark-|bookmark|countNotes|reading-sessions/.test(
        key,
      )
    ) {
      cache.delete(key);
      reset(key);
    }
  });
};
