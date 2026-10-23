import useTranslation from 'next-translate/useTranslation';

import AcademyIcon from './AcademyIcon';
import AcademyLink from './AcademyLink';
import styles from './AccountNavigation.module.scss';

import { isAccountLinkActive } from '@/tilawa/account/navigation';
import type { AccountNavigationGroup } from '@/tilawa/account/navigation';

interface AccountNavigationProps {
  groups: readonly AccountNavigationGroup[];
  current: string;
  hrefFor?: (path: string) => string;
  onNavigate?: () => void;
}

const AccountNavigation = ({
  groups,
  current,
  hrefFor,
  onNavigate,
}: AccountNavigationProps): JSX.Element => {
  const { t } = useTranslation('account');
  const allLinks = groups.flatMap(({ links }) => links);
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <div key={group.key} className={styles.group}>
          <p className={styles.title}>{t(group.key)}</p>
          {group.links.map(({ href, key, icon }) => (
            <AcademyLink
              key={href}
              href={hrefFor ? hrefFor(href) : href}
              className={styles.item}
              onClick={onNavigate}
              ariaCurrent={isAccountLinkActive(current, href, allLinks) ? 'page' : undefined}
            >
              <AcademyIcon name={icon} />
              <span>{t(key)}</span>
            </AcademyLink>
          ))}
        </div>
      ))}
    </div>
  );
};
export default AccountNavigation;
