interface AcademyIconProps {
  name:
    | 'search'
    | 'more'
    | 'send'
    | 'mail'
    | 'user'
    | 'bell'
    | 'chat'
    | 'book'
    | 'star'
    | 'clock'
    | 'play'
    | 'globe'
    | 'check'
    | 'arrow'
    | 'eye'
    | 'eyeOff'
    | 'menu'
    | 'close'
    | 'sun'
    | 'moon'
    | 'monitor';
}

const paths: Record<AcademyIconProps['name'], string> = {
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  more: 'M12 5h.01M12 12h.01M12 19h.01',
  send: 'm22 2-7 20-4-9-9-4L22 2ZM22 2 11 13',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  moon: 'M20.7 13A9 9 0 0 1 11 3.3 9 9 0 1 0 20.7 13Z',
  monitor: 'M4 3h16a1 1 0 0 1 1 1v12H3V4a1 1 0 0 1 1-1Zm4 18h8m-4-5v5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  eyeOff:
    'm3 3 18 18M10.6 5.1 12 5c7 0 10 7 10 7a18 18 0 0 1-3.1 4.1M6.1 6.1A19 19 0 0 0 2 12s3 7 10 7c1.8 0 3.3-.5 4.6-1.2M10 10a3 3 0 0 0 4 4',
  chat: 'M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2Zm2 5h10M7 13h6',
  book: 'M12 5C8 2 3 3 3 3v15s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v15',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  play: 'm9 5 11 7-11 7Z',
  globe: 'M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  check: 'm5 12 4 4L19 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
};

const AcademyIcon = ({ name }: AcademyIconProps): JSX.Element => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={paths[name]} />
  </svg>
);

export default AcademyIcon;
