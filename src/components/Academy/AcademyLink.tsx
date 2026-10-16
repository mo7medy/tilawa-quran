import React from 'react';

import NextLink from 'next/link';
import { useRouter } from 'next/router';

interface AcademyLinkProps {
  href: string;
  className?: string;
  ariaLabel?: string;
  title?: string;
  onClick?: () => void;
  ariaCurrent?: 'page';
  children: React.ReactNode;
}

/**
 * Locale-aware academy link.
 *
 * Renders real `next/link` output pinned to the active locale, so visitors on
 * `/ar` stay in Arabic (`/teachers` becomes `/ar/teachers`, `/#programs`
 * becomes `/ar#programs`) instead of being bounced back to English.
 *
 * @param {AcademyLinkProps} props link props
 * @returns {JSX.Element} localized link
 */
const AcademyLink = ({
  href,
  className,
  ariaLabel,
  title,
  onClick,
  ariaCurrent,
  children,
}: AcademyLinkProps): JSX.Element => {
  const { locale } = useRouter();
  return (
    <NextLink
      href={href}
      locale={locale}
      className={className}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      aria-current={ariaCurrent}
    >
      {children}
    </NextLink>
  );
};

export default AcademyLink;
