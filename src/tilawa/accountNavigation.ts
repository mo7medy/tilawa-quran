import { getAcademyRegistrationUrl, readAcademyPlanSelection } from './academyPlans';

type AccountQuery = Record<string, string | string[] | undefined>;

/**
 * Keep selected package and reader return path across account and recovery forms.
 * @returns {string} account query suffix, without a recovery flag
 */
const getAccountQuerySuffix = (query: AccountQuery): string => {
  const selection = readAcademyPlanSelection(query);
  const params = new URLSearchParams(
    selection
      ? getAcademyRegistrationUrl(
          selection.plan,
          selection.subject,
          selection.gift ?? 'recitation',
        ).split('?')[1]
      : '',
  );
  if (typeof query.r === 'string' && query.r) params.set('r', query.r);
  const suffix = params.toString();
  return suffix ? `?${suffix}` : '';
};

export default getAccountQuerySuffix;
