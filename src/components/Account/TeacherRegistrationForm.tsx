import styles from './Account.module.scss';
import { Status } from './AccountUi';
import TeacherFields from './TeacherFields';
import wizard from './TeacherRegistration.module.scss';
import { useAccountUi } from './useAccountUi';
import useTeacherRegistration from './useTeacherRegistration';

const TeacherRegistrationForm = (): JSX.Element => {
  const { t, lang, busy } = useAccountUi();
  const flow = useTeacherRegistration();
  const {
    submit: handleSubmit,
    clearValidation: handleChange,
    setPhoto: handlePhotoChange,
    cancel: handleCancel,
  } = flow;
  const stages = ['identity', 'pricing'];
  return (
    <form
      key={`${flow.version}-${lang}`}
      ref={flow.form}
      className={wizard.form}
      noValidate
      onSubmit={handleSubmit}
      onChange={handleChange}
      aria-label={t('teacher-wizard.form')}
    >
      <nav aria-label={t('teacher-wizard.stages')}>
        <ol className={wizard.steps}>
          {stages.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                className={wizard.step}
                aria-current={index === flow.step ? 'step' : undefined}
                disabled={busy}
                onClick={() => flow.navigate(index)}
              >
                <span className={wizard.number} aria-hidden="true">
                  {index + 1}
                </span>
                <span>{t(`teacher-wizard.${name}`)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <p className={styles.muted}>
        {t('teacher-wizard.progress', { current: flow.step + 1, total: stages.length })}
      </p>
      <h3 ref={flow.heading} tabIndex={-1}>
        {t(`teacher-wizard.${stages[flow.step]}`)}
      </h3>
      <p className={styles.muted}>{t(`teacher-wizard.${stages[flow.step]}-hint`)}</p>
      <TeacherFields step={flow.step} photo={flow.photo} onPhotoChange={handlePhotoChange} />
      {flow.message && <Status error={flow.message !== 'saved'}>{t(flow.message)}</Status>}
      <div className={styles.actions}>
        {flow.step > 0 && (
          <button
            className={wizard.secondary}
            type="button"
            disabled={busy}
            onClick={() => flow.navigate(flow.step - 1)}
          >
            {t('teacher-wizard.back')}
          </button>
        )}
        <button type="submit" disabled={busy}>
          {t(flow.step === 0 ? 'teacher-wizard.next' : 'save-preview')}
        </button>
        <button type="button" className={wizard.secondary} disabled={busy} onClick={handleCancel}>
          {t('cancel-edit')}
        </button>
      </div>
    </form>
  );
};
export default TeacherRegistrationForm;
