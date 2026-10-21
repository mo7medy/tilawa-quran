import type { StudentAccount } from './types';

const COUNTRY_CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  );

export const countryOptions = (
  locale: string,
  current = '',
): { value: string; label: string }[] => {
  const english = new Intl.DisplayNames(['en'], { type: 'region' });
  const display = new Intl.DisplayNames([locale === 'ar' ? 'ar' : 'en'], { type: 'region' });
  const options = COUNTRY_CODES.map((code) => ({
    value: english.of(code) || code,
    label: display.of(code) || code,
  }));
  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: current });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, locale));
};

export const validStudentProfile = (student: StudentAccount): boolean => {
  const birth = student.birthDate;
  let validZone = false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: student.zone }).format();
    validZone = true;
  } catch {
    validZone = false;
  }
  return (
    !!student.name.trim() &&
    student.name.trim().length <= 100 &&
    !!student.country.trim() &&
    student.country.length <= 80 &&
    student.goal.length <= 1500 &&
    student.schedule.length <= 200 &&
    validZone &&
    (!birth ||
      (/^\d{4}-\d{2}-\d{2}$/.test(birth) &&
        Number.isFinite(Date.parse(`${birth}T00:00:00Z`)) &&
        new Date(`${birth}T00:00:00Z`).toISOString().slice(0, 10) === birth &&
        birth <= new Date().toISOString().slice(0, 10)))
  );
};

export const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

export const accountTimeZones = (saved: string, detected: string): string[] => {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
  return Array.from(
    new Set(
      ['UTC', saved, detected, ...(intl.supportedValuesOf?.('timeZone') ?? [])].filter(Boolean),
    ),
  ).sort();
};
