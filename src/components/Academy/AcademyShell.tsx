import React from 'react';

import useTranslation from 'next-translate/useTranslation';

import AcademyFooter from './AcademyFooter';
import AcademyHeader from './AcademyHeader';
import styles from './AcademyShell.module.scss';

interface AcademyShellProps {
  children: React.ReactNode;
}

/**
 * Standalone Tilawa academy shell.
 *
 * Deliberately light: academy pages mount NONE of the Quran stack
 * (no Quran navbar/footer, no audio player, no font preloader, no Quran
 * global listeners). Direction is provided by `_app.tsx`.
 *
 * @param {AcademyShellProps} props shell props
 * @param {React.ReactNode} props.children page content
 * @returns {JSX.Element} the academy shell
 */
const AcademyShell = ({ children }: AcademyShellProps): JSX.Element => {
  const { lang } = useTranslation('academy');
  return (
    <div className={`${styles.shell} ${lang === 'ar' ? styles.arabic : ''}`}>
      <AcademyHeader />
      <main>{children}</main>
      <AcademyFooter />
    </div>
  );
};

export default AcademyShell;
