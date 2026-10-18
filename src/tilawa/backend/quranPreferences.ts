/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable no-restricted-syntax -- Server-side bounded loops preserve command order and cap upstream request concurrency. */
/* eslint-disable no-await-in-loop -- Sequential bounded operations preserve order and avoid bursts of upstream requests. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import type { Row } from './mappers';
import { text } from './quranCommon';
import type { QuranContext } from './quranContext';

export const quranPreferences = async (context: QuranContext): Promise<void> => {
  const { res, path, get, body, query, read, command } = context;

  if (get) {
    const preferences = await read('quran_preferences');
    const latestStyle = preferences
      .filter((item) => item.preference_group === 'quranReaderStyles')
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
    const selected = Number(query.mushafId ?? latestStyle?.mushaf_id ?? 0);
    const result: Row = {};
    preferences
      .filter((p) => p.mushaf_id === 0 || p.mushaf_id === selected)
      .sort((a, b) => Number(a.mushaf_id) - Number(b.mushaf_id))
      .forEach((p) => {
        result[text(p.preference_group)] = {
          ...((result[text(p.preference_group)] as Row) ?? {}),
          ...(p.value as Row),
        };
      });
    res.json(result);
    return;
  }
  if (path[1] === 'bulk') {
    for (const [group, values] of Object.entries(body)) {
      if (values && typeof values === 'object') {
        await command('preference.save', {
          group,
          values,
          mushafId: Number(query.mushafId ?? 0),
        });
      }
    }
  } else {
    await command('preference.save', {
      group: body.group,
      values: { [text(body.key)]: body.value },
      mushafId: Number(query.mushafId ?? 0),
    });
  }
  res.json({ success: true });
};
