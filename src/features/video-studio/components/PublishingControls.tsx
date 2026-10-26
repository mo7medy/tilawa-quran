import PublishingDestination from './PublishingDestination';

interface PublishingControlsProps {
  scope: string;
}
const PublishingControls = ({ scope }: PublishingControlsProps): JSX.Element => (
  <>
    <PublishingDestination scope={scope} platform="tiktok" />
    <PublishingDestination scope={scope} platform="instagram" />
  </>
);
export default PublishingControls;
