/* eslint-disable react/no-multi-comp -- Small related account view primitives share one module. */
import { useId, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import * as Dialog from '@radix-ui/react-dialog';

import AcademyIcon from '../Academy/AcademyIcon';
import type { AcademyIconName } from '../Academy/AcademyIcon';
import AcademyLink from '../Academy/AcademyLink';

import styles from './Account.module.scss';
import { useAccountUi } from './useAccountUi';

export const Panel = ({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: AcademyIconName;
  children: ReactNode;
}): JSX.Element => (
  <section className={styles.panel}>
    {title && (
      <h2 className={styles.panelTitle}>
        {icon && <AcademyIcon name={icon} size={24} />}
        {title}
      </h2>
    )}
    {children}
  </section>
);
export const AccountLink = ({
  to,
  children,
  primary = false,
}: {
  to: string;
  children: ReactNode;
  primary?: boolean;
}): JSX.Element => {
  const { href } = useAccountUi();
  return (
    <AcademyLink className={primary ? styles.primaryLink : styles.link} href={href(to)}>
      {children}
      <AcademyIcon name="arrow" />
    </AcademyLink>
  );
};
export { default as EmptyState } from './AccountEmptyState';
export const Field = ({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }): JSX.Element => {
  const id = useId();
  return (
    <label className={styles.field} htmlFor={id}>
      {label}
      <input {...props} id={id} />
    </label>
  );
};
export const TextField = ({
  label,
  name,
  value,
  required = false,
}: {
  label: string;
  name: string;
  value?: string;
  required?: boolean;
}): JSX.Element => {
  const id = useId();
  return (
    <label className={styles.field} htmlFor={id}>
      {label}
      <textarea
        id={id}
        name={name}
        defaultValue={value}
        required={required}
        rows={3}
        maxLength={1500}
      />
    </label>
  );
};
export const Status = ({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}): JSX.Element => (
  <div className={error ? styles.error : styles.notice} role={error ? 'alert' : 'status'}>
    {children}
  </div>
);
export const PreviewDialog = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}): JSX.Element => {
  const { t, lang, backend } = useAccountUi();
  const opener = useRef<HTMLElement>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement),
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.dialog}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
          }}
        >
          <div className={styles.row}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close aria-label={t('close')} className={styles.iconButton}>
              <AcademyIcon name="close" />
            </Dialog.Close>
          </div>
          <Dialog.Description>{t(backend ? 'private-data' : 'preview-note')}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
