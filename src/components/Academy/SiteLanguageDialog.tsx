import { useState } from 'react';

import * as Dialog from '@radix-ui/react-dialog';
import useTranslation from 'next-translate/useTranslation';

import styles from './AcademyLanguageSwitch.module.scss';
import SiteLanguageOptions from './SiteLanguageOptions';

import GlobeIcon from '@/icons/globe.svg';

interface SiteLanguageDialogProps {
  onNavigate?: () => void;
  changingLocale: string | null;
  onLanguageChange: (locale: string, onComplete?: () => void) => Promise<void>;
}

const SiteLanguageDialog = ({
  onNavigate,
  changingLocale,
  onLanguageChange,
}: SiteLanguageDialogProps): JSX.Element => {
  const { t, lang } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const handleSelect = (locale: string): Promise<void> =>
    onLanguageChange(locale, () => {
      setIsOpen(false);
      onNavigate?.();
    });

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger
        className={styles.trigger}
        aria-label={t('languages')}
        title={t('languages')}
        data-testid="academy-language-switch"
      >
        <GlobeIcon aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.drawer} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className={styles.heading}>
            <Dialog.Title>{t('select-language')}</Dialog.Title>
            <Dialog.Close className={styles.close} aria-label={t('close')}>
              <span aria-hidden="true">×</span>
            </Dialog.Close>
          </div>
          <Dialog.Description className={styles.srOnly}>{t('languages')}</Dialog.Description>
          <SiteLanguageOptions changingLocale={changingLocale} onSelect={handleSelect} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SiteLanguageDialog;
