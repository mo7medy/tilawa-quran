import type { ReactNode } from 'react';

import AcademyIcon from '../Academy/AcademyIcon';
import type { AcademyIconName } from '../Academy/AcademyIcon';

import styles from './Account.module.scss';

const AccountEmptyState = ({
  icon,
  title,
  description,
  children,
}: {
  icon?: AcademyIconName;
  title?: string;
  description: string;
  children?: ReactNode;
}): JSX.Element => (
  <div className={styles.emptyState}>
    {icon && (
      <span>
        <AcademyIcon name={icon} size={24} />
      </span>
    )}
    {title && <h3>{title}</h3>}
    <p>{description}</p>
    {children}
  </div>
);

export default AccountEmptyState;
