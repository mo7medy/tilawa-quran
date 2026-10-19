import styles from './AdminReports.module.scss';

const AdminMetric = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}): JSX.Element => (
  <article className={styles.metric}>
    <p>{label}</p>
    <strong>{value}</strong>
    {hint && <small>{hint}</small>}
  </article>
);
export default AdminMetric;
