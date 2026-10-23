import React from 'react';

import NextLink from 'next/link';
import { useRouter } from 'next/router';

interface AcademyLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  id?: string;
  href: string;
  className?: string;
  ariaLabel?: string;
  title?: string;
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
const AcademyLink = React.forwardRef<HTMLAnchorElement, AcademyLinkProps>(
  (
    {
      id,
      href,
      className,
      ariaLabel,
      title,
      onClick,
      ariaCurrent,
      children,
      ...linkProps
    }: AcademyLinkProps,
    ref,
  ): JSX.Element => {
    const { locale } = useRouter();
    return (
      <NextLink
        {...linkProps}
        ref={ref}
        id={id}
        href={href}
        locale={locale}
        className={className}
        aria-label={ariaLabel ?? linkProps['aria-label']}
        title={title}
        onClick={onClick}
        aria-current={ariaCurrent ?? linkProps['aria-current']}
      >
        {children}
      </NextLink>
    );
  },
);

AcademyLink.displayName = 'AcademyLink';

export default AcademyLink;
