/* eslint-disable react-func/max-lines-per-function -- Declarative form fields and explicit protocol mappings are kept together for auditability. */
import { useEffect, useState } from 'react';

import useTranslation from 'next-translate/useTranslation';
import { useSWRConfig } from 'swr';

import styles from './Account.module.scss';
import { useOptionalAccountPreview } from './AccountPreviewProvider';

import { object, rows } from '@/tilawa/backend/mappers';
import {
  guestImportChoice,
  guestQuranSnapshot,
  setGuestImportChoice,
} from '@/tilawa/backend/privateCache';
import { getMushafId } from '@/utils/api';
import { syncUserLocalData } from '@/utils/auth/api';
import type { SyncLocalDataPayload } from 'types/auth/SyncDataType';

const GuestQuranImport = (): JSX.Element | null => {
  const account = useOptionalAccountPreview();
  const { t } = useTranslation('account');
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const { mutate } = useSWRConfig();
  const id = account?.userId;
  useEffect(() => {
    if (!id || !account?.backend) {
      setPending(false);
      return;
    }
    const snapshot = guestQuranSnapshot();
    const bookmarks = object(snapshot.bookmarks);
    const tracker = object(snapshot.readingTracker);
    const hasData =
      Object.keys(object(bookmarks.bookmarkedVerses)).length ||
      Object.keys(object(bookmarks.bookmarkedPages)).length ||
      Object.keys(object(tracker.recentReadingSessions)).length ||
      rows(object(snapshot.pinnedVerses).verses).length ||
      object(snapshot.guestBookmark).readingBookmark;
    setPending(!!hasData && !guestImportChoice(id));
  }, [id, account?.backend]);
  if (!pending || !id) return null;
  const choose = async (merge: boolean): Promise<void> => {
    if (!merge) {
      setGuestImportChoice(id, 'separate');
      setPending(false);
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const snapshot = guestQuranSnapshot();
      const reader = object(snapshot.quranReaderStyles);
      const mushaf = Number(
        reader.quranFont
          ? getMushafId(
              reader.quranFont as Parameters<typeof getMushafId>[0],
              reader.mushafLines as Parameters<typeof getMushafId>[1],
            ).mushaf
          : 1,
      );
      const bookmarks = object(snapshot.bookmarks);
      const tracker = object(snapshot.readingTracker);
      const bookmarkItems = Object.entries(object(bookmarks.bookmarkedVerses)).map(([key, at]) => ({
        type: 'ayah',
        key: Number(key.split(':')[0]),
        verseNumber: Number(key.split(':')[1]),
        mushaf,
        createdAt: new Date(Number(at)).toISOString(),
      }));
      const pages = Object.entries(object(bookmarks.bookmarkedPages)).map(([key, at]) => ({
        type: 'page',
        key: Number(key),
        mushaf,
        createdAt: new Date(Number(at)).toISOString(),
      }));
      const reading = object(object(snapshot.guestBookmark).readingBookmark);
      await syncUserLocalData({
        bookmarks: [
          ...bookmarkItems,
          ...pages,
          ...(reading.key ? [{ ...reading, mushaf: reading.mushafId, isReading: true }] : []),
        ],
        readingSessions: Object.entries(object(tracker.recentReadingSessions)).map(([key, at]) => ({
          chapterNumber: Number(key.split(':')[0]),
          verseNumber: Number(key.split(':')[1]),
          updatedAt: new Date(Number(at)).toISOString(),
        })),
        pinnedVerses: rows(object(snapshot.pinnedVerses).verses).map((pin) => ({
          targetType: 'ayah',
          targetId: pin.verseKey,
          metadata: {
            sourceMushafId: mushaf,
            key: pin.chapterNumber,
            verseNumber: pin.verseNumber,
          },
        })),
      } as SyncLocalDataPayload);
      setGuestImportChoice(id, 'merged');
      setPending(false);
      await mutate(
        (key) =>
          typeof key === 'string' &&
          (key.includes('/api/tilawa/') ||
            key === 'pinned-verses' ||
            key.startsWith('reading-bookmark-')),
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <aside className={styles.importPrompt} aria-label={t('guest-import.title')}>
      <strong>{t('guest-import.title')}</strong>
      <p>{t('guest-import.description')}</p>
      {error && <p role="alert">{t('backend-error')}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            choose(true);
          }}
        >
          {t(busy ? 'saving' : 'guest-import.merge')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            choose(false);
          }}
        >
          {t('guest-import.separate')}
        </button>
      </div>
    </aside>
  );
};
export default GuestQuranImport;
