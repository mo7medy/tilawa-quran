import PhotoField from './PhotoField';
import TeacherIdentityFields from './TeacherIdentityFields';
import TeacherPresentationFields from './TeacherPresentationFields';
import TeacherPricingFields from './TeacherPricingFields';

interface TeacherFieldsProps {
  step: number;
  photo: string;
  onPhotoChange: (photo: string) => void;
}

// Keep stages mounted so going back preserves the values of uncontrolled fields.
const TeacherFields = ({ step, photo, onPhotoChange }: TeacherFieldsProps): JSX.Element => (
  <>
    <div data-teacher-step="0" hidden={step !== 0}>
      <PhotoField value={photo} onChange={onPhotoChange} isOptional />
      <TeacherIdentityFields />
    </div>
    <div data-teacher-step="1" hidden={step !== 1}>
      <TeacherPricingFields />
      <TeacherPresentationFields />
    </div>
  </>
);
export default TeacherFields;
