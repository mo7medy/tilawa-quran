import type { NextApiRequest } from 'next';

import type { Row } from './mappers';

export const text = (value: unknown): string => (typeof value === 'string' ? value : '');
export const bookmark = (b: Row): Row => ({
  id: b.id,
  type: b.type,
  key: b.key,
  verseNumber: b.verse_number,
  isReading: b.is_reading,
  createdAt: b.created_at,
  isInDefaultCollection: b.is_default ?? false,
});
export const page = <T>(
  items: T[],
  query: NextApiRequest['query'],
): { data: T[]; pagination: Row } => {
  const offset = Math.max(
    0,
    Number(query.cursor) || ((Number(query.page) || 1) - 1) * (Number(query.limit) || 20),
  );
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const next = offset + limit < items.length ? String(offset + limit) : null;
  return {
    data: items.slice(offset, offset + limit),
    pagination: {
      next,
      nextCursor: next,
      hasMore: !!next,
      startCursor: String(offset),
      endCursor: next ?? undefined,
      hasNextPage: !!next,
      hasPreviousPage: offset > 0,
      totalRecords: items.length,
      perPage: limit,
      currentPage: Math.floor(offset / limit) + 1,
    },
  };
};
