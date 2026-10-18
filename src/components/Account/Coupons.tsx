import { useState } from 'react';

import type { Coupon } from '../../tilawa/account/types';

import styles from './Account.module.scss';
import { Field, Panel, PreviewDialog, Status } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const Coupons = (): JSX.Element => {
  const { t, state, dispatch, router } = useAccountUi();
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [error, setError] = useState(false);
  return (
    <Panel title={t('coupons')}>
      <button
        type="button"
        onClick={() => {
          setEditing({});
          setError(false);
        }}
      >
        {t('create-coupon')}
      </button>
      {(router.query.view === 'empty' || !state.coupons.length) && (
        <p className={styles.empty}>{t('no-coupons')}</p>
      )}
      {router.query.view !== 'empty' &&
        state.coupons.map((coupon) => (
          <article key={coupon.id} className={styles.listCard}>
            <div>
              <h3>{coupon.code}</h3>
              <p>
                {t('coupon-summary', { percent: coupon.percent })} ·{' '}
                {t(coupon.active ? 'active' : 'inactive')}
              </p>
              <p>
                {t('coupon-limit')}: {coupon.limit}
              </p>
              {coupon.expires && (
                <p>
                  {t('expires')}: {coupon.expires}
                </p>
              )}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => {
                  setEditing(coupon);
                  setError(false);
                }}
              >
                {t('edit')}
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() =>
                  dispatch({ type: 'coupon', value: { ...coupon, active: !coupon.active } })
                }
              >
                {t(coupon.active ? 'deactivate' : 'activate')}
              </button>
            </div>
          </article>
        ))}
      {editing && (
        <PreviewDialog
          title={t(editing.id ? 'edit-coupon' : 'create-coupon')}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const code = String(form.get('code')).trim().toUpperCase();
              if (
                state.coupons.some((coupon) => coupon.id !== editing.id && coupon.code === code)
              ) {
                setError(true);
                return;
              }
              const saved = await dispatch({
                type: 'coupon',
                value: {
                  id: editing.id ?? `coupon-${Date.now()}`,
                  code,
                  percent: Number(form.get('percent')),
                  limit: Number(form.get('limit')),
                  active: editing.active ?? true,
                  expires: String(form.get('expires')),
                },
              });
              if (saved !== false) setEditing(null);
            }}
          >
            <Field
              label={t('coupon-code')}
              name="code"
              defaultValue={editing.code}
              required
              pattern="[A-Za-z0-9_-]{3,24}"
              maxLength={24}
            />
            <Field
              label={t('coupon-percent')}
              name="percent"
              type="number"
              min={1}
              max={90}
              step={1}
              defaultValue={editing.percent ?? 10}
              required
            />
            <Field
              label={t('coupon-limit')}
              name="limit"
              type="number"
              min={1}
              step={1}
              defaultValue={editing.limit ?? 10}
              required
            />
            <Field label={t('expires')} name="expires" type="date" defaultValue={editing.expires} />
            {error && <Status error>{t('duplicate-coupon')}</Status>}
            <button type="submit">{t('save-preview')}</button>
          </form>
        </PreviewDialog>
      )}
    </Panel>
  );
};
export default Coupons;
