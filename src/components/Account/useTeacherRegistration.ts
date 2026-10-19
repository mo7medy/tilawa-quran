/* eslint-disable react-func/max-lines-per-function -- Keep the two-stage form lifecycle and validation in one hook. */
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import buildTeacherDraft from '../../tilawa/account/teacherDraft';

import { useAccountUi } from './useAccountUi';

type TeacherControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const useTeacherRegistration = () => {
  const { t, state, dispatch, lang, busy } = useAccountUi();
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(state.teacher.publicProfile.photoUrl ?? '');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const invalidField = useRef<TeacherControl | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (invalidField.current) {
      invalidField.current.focus();
      invalidField.current.reportValidity();
      invalidField.current = null;
    } else heading.current?.focus();
  }, [step]);
  const validate = (stage: number): boolean => {
    const root = form.current?.querySelector(`[data-teacher-step="${stage}"]`);
    if (!root) return false;
    const controls = Array.from(root.querySelectorAll<TeacherControl>('input, select, textarea'));
    controls.forEach((input) => {
      input.setCustomValidity(
        input.required && !input.disabled && !input.value.trim()
          ? t('teacher-wizard.required')
          : '',
      );
    });
    const phone = root.querySelector<HTMLInputElement>('input[name="phone"]');
    phone?.setCustomValidity(
      phone.value.replace(/\D/g, '').length < 8 ? t('teacher-wizard.phone-required') : '',
    );
    const choices = root.querySelectorAll<HTMLInputElement>('input[name="specialty"]');
    choices[0]?.setCustomValidity(
      choices.length && !Array.from(choices).some((item) => item.checked)
        ? t('teacher-wizard.specialty-required')
        : '',
    );
    const invalid = controls.find((input) => !input.disabled && !input.checkValidity());
    if (!invalid) return true;
    setMessage('teacher-wizard.invalid');
    if (stage !== step) {
      invalidField.current = invalid;
      setStep(stage);
    } else {
      invalid.focus();
      invalid.reportValidity();
    }
    return false;
  };
  const navigate = (next: number): void => {
    if (busy || (next > step && !validate(step))) return;
    setMessage('');
    setStep(next);
  };
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    if (step === 0) {
      navigate(1);
      return;
    }
    if (!validate(0) || !validate(1)) return;
    const draft = buildTeacherDraft(new FormData(event.currentTarget), state.teacher, photo, lang);
    if (!draft) {
      setMessage('teacher-wizard.invalid');
      return;
    }
    setMessage('');
    if ((await dispatch({ type: 'teacher', value: draft })) !== false) setMessage('saved');
  };
  const cancel = (): void => {
    setPhoto(state.teacher.publicProfile.photoUrl ?? '');
    setStep(0);
    setMessage('');
    setVersion((value) => value + 1);
  };
  const clearValidation = (): void => {
    setMessage('');
    form.current?.querySelectorAll<TeacherControl>('input, select, textarea').forEach((input) => {
      input.setCustomValidity('');
    });
  };
  return {
    step,
    photo,
    setPhoto,
    message,
    version,
    form,
    heading,
    navigate,
    submit,
    cancel,
    clearValidation,
  };
};
export default useTeacherRegistration;
