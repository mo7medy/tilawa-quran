import { useId } from 'react';

import useTranslation from 'next-translate/useTranslation';

import { formatPreviewSlot, getPreviewSlots } from '../../tilawa/teacherBookingPreview';

import styles from './TeacherProfile.module.scss';

interface TeacherAvailabilityProps {
  date: string;
  minimumDate: string;
  zone: string;
  selectedSlot: string;
  onDateChange: (date: string) => void;
  onZoneChange: (zone: string) => void;
  onSlotChange: (slot: string) => void;
}

const ZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Australia/Sydney',
];

const TeacherAvailability = ({
  date,
  minimumDate,
  zone,
  selectedSlot,
  onDateChange,
  onZoneChange,
  onSlotChange,
}: TeacherAvailabilityProps): JSX.Element => {
  const { t, lang } = useTranslation('academy');
  const controlId = useId();
  const slots = getPreviewSlots(date);
  return (
    <div className={styles.availability}>
      <label htmlFor={`${controlId}-zone`}>{t('profile.timezone')}</label>
      <select
        id={`${controlId}-zone`}
        value={zone}
        onChange={(event) => onZoneChange(event.target.value)}
      >
        {ZONES.map((item) => (
          <option key={item} value={item}>
            {t(`profile.zones.${item.replaceAll('/', '-')}`)}
          </option>
        ))}
      </select>
      <label htmlFor={`${controlId}-date`}>{t('profile.date')}</label>
      <input
        id={`${controlId}-date`}
        type="date"
        value={date}
        min={minimumDate}
        onChange={(event) => onDateChange(event.target.value)}
        required
      />
      <p className={styles.small}>{t('profile.schedule-demo')}</p>
      <div className={styles.slots} role="group" aria-label={t('profile.select-time')}>
        {slots.map((slot) => (
          <button
            type="button"
            key={slot}
            aria-pressed={selectedSlot === slot}
            onClick={() => onSlotChange(slot)}
          >
            {formatPreviewSlot(slot, lang, zone)}
          </button>
        ))}
      </div>
      {slots.length === 0 && (
        <p role="status" className={styles.small}>
          {t('profile.no-times')}
        </p>
      )}
    </div>
  );
};

export default TeacherAvailability;
