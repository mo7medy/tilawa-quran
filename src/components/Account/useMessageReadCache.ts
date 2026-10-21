import { useEffect, useRef } from 'react';

import type { Row } from '@/tilawa/backend/rows';

/** Keep the directory mounted across thread links, never across account owners.
 * @returns {Row | undefined} Current read or same-owner message directory while refreshing.
 */
const useMessageReadCache = (
  owner: string | undefined,
  view: string | undefined,
  page?: Row,
): Row | undefined => {
  const previous = useRef<{ owner: string; data: Row }>();
  useEffect(() => {
    if (!owner || view !== 'messages') previous.current = undefined;
    else if (page) previous.current = { owner, data: page };
  }, [owner, view, page]);
  return (
    page ||
    (owner && view === 'messages' && previous.current?.owner === owner
      ? previous.current.data
      : undefined)
  );
};

export default useMessageReadCache;
