export type Row = Record<string, unknown>;
export const object = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
export const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.map(object) : []);
export const string = (value: unknown): string => (typeof value === 'string' ? value : '');
export const bilingual = (value: unknown): { en: string; ar: string } => ({
  en: string(object(value).en),
  ar: string(object(value).ar),
});
