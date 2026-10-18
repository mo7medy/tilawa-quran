import { useState } from 'react';

import { validAvailability } from '../../tilawa/account/rules';
import { ACCOUNT_ZONES } from '../../tilawa/account/time';

import styles from './Account.module.scss';
import { Field, Panel, Status } from './AccountUi';
import { useAccountUi } from './useAccountUi';

const AvailabilityEditor = (): JSX.Element => {
  const { t, state, dispatch, router } = useAccountUi();
  const [slots, setSlots] = useState(router.query.view === 'empty' ? [] : state.availability);
  const [zone, setZone] = useState(state.availabilityZone);
  const [message, setMessage] = useState('');
  return (
    <Panel title={t('availability')}>
      <p>{t('availability-description')}</p>
      <form
        onChange={() => setMessage('')}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!validAvailability(slots)) {
            setMessage('overlapping-slots');
            return;
          }
          if ((await dispatch({ type: 'availability', value: slots, zone })) === false) return;
          setMessage('saved');
        }}
      >
        <label htmlFor="account-availabilityeditor-1064" className={styles.field}>
          {t('timezone')}
          <select
            id="account-availabilityeditor-1064"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
          >
            {ACCOUNT_ZONES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        {!slots.length && <p className={styles.empty}>{t('no-availability')}</p>}
        {slots.map((slot) => (
          <fieldset key={slot.id} className={styles.slot}>
            <legend>{t('time-slot')}</legend>
            <label htmlFor={`account-availabilityeditor-1580-${slot.id}`} className={styles.field}>
              {t('day')}
              <select
                id={`account-availabilityeditor-1580-${slot.id}`}
                value={slot.day}
                onChange={(event) =>
                  setSlots(
                    slots.map((item) =>
                      item.id === slot.id ? { ...item, day: Number(event.target.value) } : item,
                    ),
                  )
                }
              >
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <option key={day} value={day}>
                    {t(`days.${day}`)}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label={t('starts-at')}
              type="time"
              value={slot.start}
              required
              onChange={(event) =>
                setSlots(
                  slots.map((item) =>
                    item.id === slot.id ? { ...item, start: event.target.value } : item,
                  ),
                )
              }
            />
            <Field
              label={t('ends-at')}
              type="time"
              value={slot.end}
              required
              onChange={(event) =>
                setSlots(
                  slots.map((item) =>
                    item.id === slot.id ? { ...item, end: event.target.value } : item,
                  ),
                )
              }
            />
            <button
              className={styles.secondary}
              type="button"
              onClick={() => setSlots(slots.filter((item) => item.id !== slot.id))}
            >
              {t('remove')}
            </button>
          </fieldset>
        ))}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              setSlots([
                ...slots,
                { id: `slot-${Date.now()}`, day: 1, start: '10:00', end: '11:00' },
              ])
            }
          >
            {t('add-slot')}
          </button>
          <button type="submit">{t('save-preview')}</button>
          <button
            className={styles.secondary}
            type="button"
            onClick={() => {
              setSlots(state.availability);
              setZone(state.availabilityZone);
              setMessage('');
            }}
          >
            {t('cancel-edit')}
          </button>
        </div>
        {message && <Status error={message !== 'saved'}>{t(message)}</Status>}
      </form>
    </Panel>
  );
};
export default AvailabilityEditor;
