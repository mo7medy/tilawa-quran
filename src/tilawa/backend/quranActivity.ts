/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
/* eslint-disable import/prefer-default-export -- Named backend entrypoints make route and domain imports explicit. */
import { page } from './quranCommon';
import type { QuranContext } from './quranContext';
import { pageNumbersForRanges, pagesForRanges } from './quranPages';
import { calculateStreak, estimatedWeek, localDate, quranProgress } from './quranProgress';
import { normalizeRange } from './quranRanges';

export const quranActivity = async (context: QuranContext): Promise<void> => {
  const { req, res, client, user, path, get, body, query, read, command } = context;

  const mushaf = Number(query.mushafId ?? 1);
  const { data: profile, error } = await client
    .from('profiles')
    .select('time_zone')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  const zone = profile.time_zone ?? 'UTC';
  const today = localDate(new Date(), zone);
  if (path[0] === 'goal' && path[1] === 'estimate') {
    res.json({ data: estimatedWeek({ ...query, amount: query.amount }, today) });
    return;
  }
  if (path[0] === 'activity-days' && path[1] === 'estimate-reading-time') {
    const ranges = String(query.ranges ?? '')
      .split(',')
      .filter(Boolean)
      .map(normalizeRange);
    res.json({ data: { seconds: (await pagesForRanges(ranges, mushaf)) * 120 } });
    return;
  }
  const goals = await read('quran_goals');
  const existing = goals.find((g) => g.category === (query.type ?? body.category ?? 'QURAN'));
  if (!get && path[0] === 'goal') {
    const values = {
      type: existing?.type,
      amount: existing?.target_amount,
      duration: existing?.duration,
      ...body,
    };
    if (values.type === 'QURAN_RANGE' && values.amount) {
      values.amount = normalizeRange(String(values.amount));
    }
    await command(req.method === 'DELETE' ? 'goal.delete' : 'goal.save', {
      ...values,
      category: body.category ?? query.type ?? 'QURAN',
      mushafId: mushaf,
    });
  }
  if (!get && path[0] === 'activity-days') {
    const ranges = Array.isArray(body.ranges) ? body.ranges.map(String).map(normalizeRange) : [];
    const pageNumbers = ranges.length ? await pageNumbersForRanges(ranges, mushaf) : [];
    await command('activity.save', {
      ...body,
      ranges,
      pages: ranges.length ? 0 : Number(body.pages ?? 0),
      pageNumbers,
      mushafId: mushaf,
    });
  }
  const goal = (!get && path[0] === 'goal' ? await read('quran_goals') : goals).find(
    (g) => g.category === (query.type ?? body.category ?? 'QURAN'),
  );
  const { status, days, current } = await quranProgress(
    goal,
    await read('quran_activity_days'),
    mushaf,
    today,
    zone,
  );
  if (path[0] === 'goal') {
    res.json({ data: status });
    return;
  }
  const filtered = days.filter(
    (d) =>
      (!query.from || String(d.date) >= String(query.from)) &&
      (!query.to || String(d.date) <= String(query.to)),
  );
  if (path[0] === 'streak') {
    res.json({
      data: { streak: calculateStreak(days, today), goal: status, activityDays: filtered },
    });
    return;
  }
  if (path[1] === 'filter') {
    res.json(page(filtered, query));
    return;
  }
  const value = {
    ...current,
    hasRead:
      Number(current.secondsRead) > 0 ||
      Number(current.pagesRead) > 0 ||
      (Array.isArray(current.ranges) && current.ranges.length > 0),
  };
  res.json(get ? { data: value } : value);
};
