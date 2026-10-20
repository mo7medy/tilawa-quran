/* eslint-disable no-nested-ternary -- Small enum/label selections keep existing UI and wire-state mappings adjacent. */
import { useState } from 'react';

import { availableBalance } from '../../tilawa/account/rules';

import styles from './Account.module.scss';
import { AccountLink, Field, Panel, Status } from './AccountUi';
import { useAccountUi } from './useAccountUi';

import { object, rows, string } from '@/tilawa/backend/mappers';

const TeacherFinance = ({ withdrawal = false }: { withdrawal?: boolean }): JSX.Element => {
  const { t, price, state, dispatch, router, backend, snapshot, busy } = useAccountUi();
  const [result, setResult] = useState('');
  const pending = state.withdrawals
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + item.amountCents, 0);
  const empty = router.query.view === 'empty';
  return (
    <>
      <Panel title={t('balances')}>
        <p>{t(backend ? 'finance-live-note' : 'finance-demo')}</p>
        <dl className={styles.details}>
          <div>
            <dt>{t('available-earnings')}</dt>
            <dd>{price(empty ? 0 : availableBalance(state))}</dd>
          </div>
          <div>
            <dt>{t('pending-earnings')}</dt>
            <dd>{price(empty ? 0 : backend ? state.pendingCents ?? 0 : 4500)}</dd>
          </div>
          <div>
            <dt>{t('pending-withdrawals')}</dt>
            <dd>
              {price(
                empty ? 0 : backend ? Number(object(snapshot?.balances).withdrawals ?? 0) : pending,
              )}
            </dd>
          </div>
        </dl>
        {!withdrawal && (
          <AccountLink to="/dashboard/teacher/withdrawals">{t('request-withdrawal')}</AccountLink>
        )}
      </Panel>
      {withdrawal ? (
        <Panel title={t('request-withdrawal')}>
          <form
            onChange={() => setResult('')}
            onSubmit={async (event) => {
              event.preventDefault();
              const element = event.currentTarget;
              const form = new FormData(element);
              const amountCents = Math.round(Number(form.get('amount')) * 100);
              if (
                empty ||
                !Number.isInteger(amountCents) ||
                amountCents <= 0 ||
                amountCents > availableBalance(state)
              ) {
                setResult('invalid-withdrawal');
                return;
              }
              if (
                (await dispatch({
                  type: 'withdrawal',
                  amountCents,
                  method: String(form.get('method')),
                })) === false
              ) {
                return;
              }
              element.reset();
              setResult('withdrawal-preview-created');
            }}
          >
            <Field
              label={t('amount-usd')}
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              max={(empty ? 0 : availableBalance(state)) / 100}
            />
            <label htmlFor="account-teacherfinance-2474" className={styles.field}>
              {t('withdrawal-method')}
              <select id="account-teacherfinance-2474" name="method">
                <option value="bank">{t('bank-transfer')}</option>
              </select>
            </label>
            <p>{t('withdrawal-note')}</p>
            <button type="submit" disabled={busy || empty || availableBalance(state) <= 0}>
              {t('preview-withdrawal')}
            </button>
            {result && <Status error={result === 'invalid-withdrawal'}>{t(result)}</Status>}
          </form>
        </Panel>
      ) : (
        <Panel title={t('transactions')}>
          {empty || (backend && !rows(snapshot?.earnings).length) ? (
            <p>{t('no-transactions')}</p>
          ) : backend ? (
            rows(snapshot?.earnings).map((entry) => (
              <div className={styles.listCard} key={string(entry.id)}>
                <div>
                  <strong>
                    {t(entry.status === 'available' ? 'available-earnings' : 'pending-earnings')}
                  </strong>
                  <p>{string(entry.created_at).slice(0, 10)}</p>
                </div>
                <strong>{price(Number(entry.amount_cents))}</strong>
              </div>
            ))
          ) : (
            <div className={styles.listCard}>
              <div>
                <h3>{t('demo-settled-lessons')}</h3>
                <small>{t('sample-transaction')}</small>
              </div>
              <strong>{price(18000)}</strong>
            </div>
          )}
        </Panel>
      )}
      {(!backend || withdrawal) && (
        <Panel title={t('withdrawal-history')}>
          {empty || !state.withdrawals.length ? (
            <p className={styles.empty}>{t('no-withdrawals')}</p>
          ) : (
            state.withdrawals.map((item) => (
              <details key={item.id} className={styles.listCard}>
                <summary>
                  {item.id} · {price(item.amountCents)}
                </summary>
                <p>{t(`withdrawal-status.${item.status}`)}</p>
                <p>{t('bank-transfer')}</p>
                <small>{t('withdrawal-note')}</small>
              </details>
            ))
          )}
        </Panel>
      )}
    </>
  );
};
export default TeacherFinance;
