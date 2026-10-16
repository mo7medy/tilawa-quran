export type AcademyThemePreference = 'light' | 'dark' | 'system';
export type AcademyResolvedTheme = 'light' | 'dark';

// Retain the original key so existing Tilawa appearance choices carry across all pages.
export const ACADEMY_THEME_STORAGE_KEY = 'tilawa-academy-theme';

export const parseAcademyTheme = (value: string | null): AcademyThemePreference => {
  if (value === 'light' || value === 'dark') return value;
  return 'system';
};

export const resolveAcademyTheme = (
  preference: AcademyThemePreference,
  isSystemDark: boolean,
): AcademyResolvedTheme => {
  if (preference === 'system') return isSystemDark ? 'dark' : 'light';
  return preference;
};

// Static, allowlisted bootstrap. Runs before first paint; never changes Quran theme attributes.
export const ACADEMY_THEME_INIT_SCRIPT = `(function(){var p='system';try{var s=localStorage.getItem('${ACADEMY_THEME_STORAGE_KEY}');if(s==='light'||s==='dark')p=s;}catch(e){}var d=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-tilawa-theme',p==='system'?(d?'dark':'light'):p);})();`;
