/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable no-restricted-syntax -- Server-side bounded loops preserve command order and cap upstream request concurrency. */
/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
/* eslint-disable no-await-in-loop -- Sequential bounded operations preserve order and avoid bursts of upstream requests. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { Row } from './mappers';
import type { QuranContext } from './quranContext';

export const quranPins = async (context: QuranContext): Promise<void> => {
  const { req, res, path, get, body, query, read, command } = context;

  const toPin = (p: Row): Row => ({
    id: p.id,
    targetType: p.target_type,
    targetId: p.target_id,
    metadata: p.metadata,
    createdAt: p.created_at,
  });
  if (get) {
    res.json({
      success: true,
      data: {
        data: (await read('quran_pinned_items'))
          .filter((p) => !query.targetType || p.target_type === query.targetType)
          .map(toPin),
      },
    });
    return;
  }
  if (path[1] === 'sync') {
    const values = (body.items ?? body.pinnedItems ?? []) as Row[];
    for (const item of values) await command('pinned.save', item);
    res.json({ synced: values.length, lastSyncAt: new Date().toISOString() });
    return;
  }
  if (path[1] === 'bulk') {
    for (const targetId of (body.targetIds ?? []) as string[]) {
      await command('pinned.delete', { targetId });
    }
  } else {
    const value = await command(req.method === 'DELETE' ? 'pinned.delete' : 'pinned.save', {
      ...body,
      ...(path[1] === 'clear' ? { clear: true } : path[1] ? { id: path[1] } : {}),
    });
    if (value.id) {
      res.json(toPin(value));
      return;
    }
  }
  res.json({ success: true });
};
