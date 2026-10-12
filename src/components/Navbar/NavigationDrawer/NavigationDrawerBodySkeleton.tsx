import Skeleton from '../../dls/Skeleton/Skeleton';

import styles from './NavigationDrawerBodySkeleton.module.scss';

const NAV_ROW_COUNT = 3;
const rowsArr = Array(NAV_ROW_COUNT).fill(null);

const renderLinesSkeleton = (index) => {
  return rowsArr.map((k, i) => (
    // eslint-disable-next-line react/no-array-index-key
    <Skeleton key={`skeleton_${index}_${i}`} isActive isSquared className={styles.navRow} />
  ));
};

const NavigationDrawerBodySkeleton = () => {
  return <span className={styles.skeletonContainer}>{renderLinesSkeleton(1)}</span>;
};

export default NavigationDrawerBodySkeleton;
