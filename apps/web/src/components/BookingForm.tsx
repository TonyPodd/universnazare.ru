'use client';

import { useState, useEffect } from 'react';
import { CalendarEvent, BookingParticipant, PaymentMethod } from '@mss/shared';
import { apiClient } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { validatePhone, validateEmail } from '../lib/validation';
import Link from 'next/link';
import styles from './BookingForm.module.css';

interface BookingFormProps {
  event: CalendarEvent;
  groupSessionId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BookingForm({ event, groupSessionId, onSuccess, onCancel }: BookingFormProps) {
  const { user, isAuthenticated, activeSubscription } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [contactEmail, setContactEmail] = useState('');
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const isGroupSession = !!groupSessionId;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    isGroupSession ? PaymentMethod.SUBSCRIPTION : PaymentMethod.ON_SITE
  );

  // Step 2 fields
  const [participants, setParticipants] = useState<BookingParticipant[]>([
    { fullName: '', phone: '', age: undefined },
  ]);
  const [expandedParticipant, setExpandedParticipant] = useState<number | null>(0);
  const [phoneErrors, setPhoneErrors] = useState<string[]>([]);
  const [phoneValid, setPhoneValid] = useState<boolean[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const availableSeats = event.maxParticipants - event.currentParticipants;
  const totalPrice = event.price * participants.length;
  const discountedPrice = totalPrice * 0.9;
  const canUseSubscription = isGroupSession
    ? (isAuthenticated && activeSubscription && activeSubscription.remainingBalance > 0)
    : (isAuthenticated && activeSubscription && activeSubscription.remainingBalance >= discountedPrice);

  useEffect(() => {
    if (user) {
      setContactEmail(user.email);
      setEmailValid(true);
      const fullName = `${user.lastName} ${user.firstName}`;
      setParticipants([{
        fullName,
        phone: user.phone || '',
        age: user.age,
      }]);
    }
  }, [user]);

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (contactEmail) {
      setEmailValid(validateEmail(contactEmail));
    }
  };

  const handleEmailChange = (value: string) => {
    setContactEmail(value);
    if (emailTouched && value) {
      setEmailValid(validateEmail(value));
    }
  };

  const handleContinueToStep2 = () => {
    if (!contactEmail || !validateEmail(contactEmail)) {
      setEmailTouched(true);
      setEmailValid(false);
      return;
    }
    if (isGroupSession && !canUseSubscription) {
      return;
    }
    setStep(2);
  };

  const handleAddParticipant = () => {
    if (participants.length < availableSeats) {
      const newIndex = participants.length;
      setParticipants([...participants, { fullName: '', phone: '', age: undefined }]);
      setExpandedParticipant(newIndex);
    }
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
      if (expandedParticipant === index) {
        setExpandedParticipant(null);
      }
    }
  };


  const handleParticipantChange = (index: number, field: keyof BookingParticipant, value: string | number | undefined) => {
    const newParticipants = [...participants];
    if (field === 'fullName' || field === 'phone') {
      newParticipants[index][field] = value as string;
    } else if (field === 'age') {
      newParticipants[index][field] = value as number | undefined;
    }
    setParticipants(newParticipants);

    if (field === 'phone') {
      const newErrors = [...phoneErrors];
      const newValid = [...phoneValid];
      newErrors[index] = '';
      newValid[index] = false;
      setPhoneErrors(newErrors);
      setPhoneValid(newValid);
    }
  };

  const handlePhoneBlur = (index: number) => {
    const phone = participants[index].phone;
    if (phone) {
      const isValid = validatePhone(phone);
      const newErrors = [...phoneErrors];
      const newValid = [...phoneValid];
      if (!isValid) {
        newErrors[index] = 'Введите корректный номер телефона (например, +7 999 123-45-67)';
      } else {
        newErrors[index] = '';
      }
      newValid[index] = isValid;
      setPhoneErrors(newErrors);
      setPhoneValid(newValid);
    }
  };

  const toggleParticipant = (index: number) => {
    setExpandedParticipant(expandedParticipant === index ? null : index);
  };

  const getParticipantSummary = (participant: BookingParticipant) => {
    const parts = [];
    if (participant.fullName) parts.push(participant.fullName);
    if (participant.age) parts.push(`${participant.age} ${participant.age === 1 ? 'год' : participant.age < 5 ? 'года' : 'лет'}`);
    return parts.length > 0 ? parts.join(' · ') : 'Не заполнено';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const hasEmptyFields = participants.some(p => !p.fullName || !p.phone);
    if (hasEmptyFields) {
      addToast('Пожалуйста, заполните ФИО и телефон для всех участников', 'warning');
      setLoading(false);
      return;
    }

    const errors: string[] = participants.map(p =>
      validatePhone(p.phone) ? '' : 'Введите корректный номер телефона'
    );

    if (errors.some(error => error !== '')) {
      setPhoneErrors(errors);
      setLoading(false);
      return;
    }

    try {
      await apiClient.bookings.create({
        eventId: groupSessionId ? undefined : event.id,
        groupSessionId: groupSessionId,
        participants,
        contactEmail,
        paymentMethod,
        notes,
        subscriptionId: paymentMethod === PaymentMethod.SUBSCRIPTION && activeSubscription ? activeSubscription.id : undefined,
      });

      addToast(
        groupSessionId
          ? `Вы успешно записались на занятие! Письмо с деталями придёт на ${contactEmail}`
          : `Вы успешно записались на мастер-класс! Письмо с деталями придёт на ${contactEmail}`,
        'success',
        7000
      );
      onSuccess();
    } catch (error: any) {
      console.error('Ошибка при записи:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Неизвестная ошибка';

      if (errorMessage.includes('достаточным балансом') || errorMessage.includes('Недостаточно средств')) {
        addToast(
          'Недостаточно средств на абонементе. Пополните баланс в профиле или выберите оплату на месте.',
          'warning',
          8000
        );
      } else {
        addToast(`Не удалось записаться: ${errorMessage}`, 'error', 8000);
      }
    } finally {
      setLoading(false);
    }
  };

  const finalPrice = paymentMethod === PaymentMethod.SUBSCRIPTION ? discountedPrice : totalPrice;

  return (
    <div className={styles.form}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {groupSessionId ? 'Запись на занятие' : 'Запись на мастер-класс'}
        </h3>
        <p className={styles.eventTitle}>{event.title}</p>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className={styles.stepContent}>
            <div className={styles.eventInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Дата:</span>
                <span className={styles.infoValue}>
                  {new Intl.DateTimeFormat('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(event.startDate))}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Цена:</span>
                <span className={styles.infoValue}>{event.price} ₽ / участник</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Осталось мест:</span>
                <span className={styles.infoValueAccent}>{availableSeats}</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="contactEmail">Email для связи *</label>
              <input
                type="email"
                id="contactEmail"
                value={contactEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                required
                placeholder="example@mail.com"
                className={`${styles.input} ${emailTouched && emailValid === false ? styles.inputError : ''} ${emailValid === true ? styles.inputSuccess : ''}`}
              />
              {emailTouched && emailValid === false && (
                <span className={styles.errorMessage}>Введите корректный email</span>
              )}
              {emailValid === true && (
                <span className={styles.successMessage}>Email корректен</span>
              )}
              <p className={styles.fieldHint}>Письмо с деталями придёт на этот адрес</p>
            </div>

            <div className={styles.formGroup}>
              <label>Способ оплаты *</label>
              {isGroupSession ? (
                <div className={styles.paymentInfo}>
                  {canUseSubscription ? (
                    <div className={styles.paymentOption}>
                      <div className={styles.paymentHeader}>
                        <span className={styles.paymentTitle}>Абонемент</span>
                      </div>
                      <div className={styles.paymentDetails}>
                        Баланс: {activeSubscription?.remainingBalance.toFixed(2)} ₽ · Деньги списываются за день до занятия
                      </div>
                    </div>
                  ) : (
                    <div className={styles.paymentWarning}>
                      <div>
                        <strong>Требуется активный абонемент</strong>
                        <br />
                        <Link href="/profile" className={styles.link}>
                          Приобрести абонемент
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.paymentMethods}>
                  <label className={`${styles.paymentRadio} ${paymentMethod === PaymentMethod.ON_SITE ? styles.paymentRadioActive : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={PaymentMethod.ON_SITE}
                      checked={paymentMethod === PaymentMethod.ON_SITE}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className={styles.radio}
                    />
                    <div className={styles.paymentContent}>
                      <span className={styles.paymentTitle}>На месте</span>
                    </div>
                  </label>

                  <label className={`${styles.paymentRadio} ${paymentMethod === PaymentMethod.SUBSCRIPTION ? styles.paymentRadioActive : ''} ${!canUseSubscription ? styles.paymentRadioDisabled : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={PaymentMethod.SUBSCRIPTION}
                      checked={paymentMethod === PaymentMethod.SUBSCRIPTION}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      disabled={!canUseSubscription}
                      className={styles.radio}
                    />
                    <div className={styles.paymentContent}>
                      <span className={styles.paymentTitle}>Абонемент</span>
                      {canUseSubscription && (
                        <span className={styles.paymentDetails}>
                          Баланс: {activeSubscription?.remainingBalance.toFixed(2)} ₽ · Скидка: 10%
                        </span>
                      )}
                      {!canUseSubscription && (
                        <span className={styles.paymentDetails}>Недоступно</span>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {!isGroupSession && !isAuthenticated && (
                <div className={styles.hint}>
                  <Link href="/login" className={styles.link}>
                    Войдите в аккаунт
                  </Link>
                  {' '}для оплаты по абонементу со скидкой 10%
                </div>
              )}
            </div>

            <div className={styles.stepFooter}>
              <button
                type="button"
                onClick={onCancel}
                className={styles.linkButton}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleContinueToStep2}
                className={styles.primaryButton}
                disabled={isGroupSession && !canUseSubscription}
              >
                Продолжить
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.participantsSection}>
              <div className={styles.participantsHeader}>
                <h4 className={styles.participantsTitle}>Участники ({participants.length})</h4>
                {participants.length < availableSeats && (
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className={styles.addButton}
                  >
                    + Добавить участника
                  </button>
                )}
              </div>

              {participants.map((participant, index) => (
                <div key={index} className={styles.participantAccordion}>
                  <div className={styles.participantSummary}>
                    <div
                      className={styles.participantSummaryContent}
                      onClick={() => toggleParticipant(index)}
                    >
                      <span className={styles.participantNumber}>Участник {index + 1}</span>
                      <span className={styles.participantInfo}>{getParticipantSummary(participant)}</span>
                      <span className={styles.accordionIcon}>
                        {expandedParticipant === index ? '−' : '+'}
                      </span>
                    </div>
                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveParticipant(index);
                        }}
                        className={styles.deleteIcon}
                        aria-label="Удалить участника"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {expandedParticipant === index && (
                    <div className={styles.participantFields}>
                      <div className={styles.formGroup}>
                        <label htmlFor={`fullName-${index}`}>ФИО *</label>
                        <input
                          type="text"
                          id={`fullName-${index}`}
                          value={participant.fullName}
                          onChange={(e) => handleParticipantChange(index, 'fullName', e.target.value)}
                          required
                          placeholder="Иванов Иван Иванович"
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor={`phone-${index}`}>Телефон *</label>
                        <input
                          type="tel"
                          id={`phone-${index}`}
                          value={participant.phone}
                          onChange={(e) => handleParticipantChange(index, 'phone', e.target.value)}
                          onBlur={() => handlePhoneBlur(index)}
                          required
                          placeholder="+7 (999) 123-45-67"
                          className={`${styles.input} ${phoneErrors[index] ? styles.inputError : ''} ${phoneValid[index] ? styles.inputSuccess : ''}`}
                        />
                        {phoneErrors[index] && (
                          <span className={styles.errorMessage}>{phoneErrors[index]}</span>
                        )}
                        {phoneValid[index] && (
                          <span className={styles.successMessage}>Телефон корректен</span>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor={`age-${index}`}>Возраст *</label>
                        <input
                          type="number"
                          id={`age-${index}`}
                          min="1"
                          max="120"
                          value={participant.age || ''}
                          onChange={(e) => handleParticipantChange(index, 'age', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Полных лет"
                          className={styles.input}
                          inputMode="numeric"
                        />
                        <p className={styles.fieldHint}>Полных лет</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <p className={styles.hint}>Доступно мест: {availableSeats - participants.length}</p>
            </div>

            {!showNotes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className={styles.linkButton}
              >
                + Добавить комментарий (необязательно)
              </button>
            ) : (
              <div className={styles.formGroup}>
                <label htmlFor="notes">Комментарий</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Дополнительная информация или пожелания..."
                  className={styles.textarea}
                />
              </div>
            )}
          </div>
        )}

        <div className={styles.stickyFooter}>
          <div className={styles.footerContent}>
            <div className={styles.totalSection}>
              <div className={styles.totalLabel}>
                Итого: {participants.length} {participants.length === 1 ? 'участник' : participants.length < 5 ? 'участника' : 'участников'}
              </div>
              <div className={styles.totalPrice}>
                {finalPrice.toFixed(0)} ₽
              </div>
            </div>
            <div className={styles.footerActions}>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={styles.linkButton}
                  disabled={loading}
                >
                  ← Назад
                </button>
              )}
              {step === 2 && (
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Отправка...' : `Записать ${participants.length} ${participants.length === 1 ? 'участника' : participants.length < 5 ? 'участников' : 'участников'}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
