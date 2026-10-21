import AcademyIcon from '../Academy/AcademyIcon';

import styles from './AccountAvatar.module.scss';

import { accountInitials } from '@/tilawa/account/navigation';

const AccountAvatar = ({
  name,
  photo,
  large = false,
}: {
  name: string;
  photo?: string;
  large?: boolean;
}): JSX.Element => (
  <span className={`${styles.avatar} ${large ? styles.large : ''}`} aria-hidden="true">
    {photo ? <img src={photo} alt="" /> : accountInitials(name) || <AcademyIcon name="user" />}
  </span>
);

export default AccountAvatar;
