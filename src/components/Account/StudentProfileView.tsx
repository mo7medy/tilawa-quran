import styles from './Account.module.scss';
import { Panel } from './AccountUi';
import profileStyles from './StudentProfile.module.scss';
import { useAccountUi } from './useAccountUi';

import { countryOptions } from '@/tilawa/account/profile';

const StudentProfileView = (): JSX.Element => {
  const { t, state, lang } = useAccountUi();
  const { student } = state;
  const birth = student.birthDate
    ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(new Date(`${student.birthDate}T00:00:00Z`))
    : '';
  const items = [
    {
      title: 'personal-information',
      values: [
        ['full-name', student.name],
        [
          'country',
          countryOptions(lang, student.country).find((option) => option.value === student.country)
            ?.label || student.country,
        ],
        ['birth-date', birth],
      ],
    },
    {
      title: 'profile-ui.preferences',
      values: [
        ['learning-goal', student.goal],
        ['preferred-schedule', student.schedule],
        ['timezone', student.zone],
      ],
    },
  ];
  return (
    <div className={styles.twoColumns}>
      {items.map((section) => (
        <Panel key={section.title} title={t(section.title)}>
          <dl className={profileStyles.details}>
            {section.values.map(([label, value]) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd className={value ? '' : profileStyles.missing}>
                  {value || t('profile-ui.not-added')}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      ))}
    </div>
  );
};

export default StudentProfileView;
