'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';
import { RegularGroup, BookingParticipant, Subscription } from '@mss/shared';
import { useAuth } from '../contexts/AuthContext';
import styles from './EnrollmentForm.module.css';

interface EnrollmentFormProps {
  group: RegularGroup | null;
  onClose: () => void;
}

function formatSchedule(schedule: any): string {
  if (typeof schedule === 'string') return schedule;
  if (!schedule || !schedule.daysOfWeek || !schedule.time) return 'Не указано';

  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const days = schedule.daysOfWeek.map((d: number) => dayNames[d]).join(', ');
  return `${days} в ${schedule.time} (${schedule.duration} мин)`;
}

export default function EnrollmentForm({ group, onClose }: EnrollmentFormProps) {
  const { user, isAuthenticated } = useAuth();
  const [participants, setParticipants] = useState<BookingParticipant[]>([{ fullName: '', phone: '' }]);
  const [contactEmail, setContactEmail] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      setContactEmail(user.email);
      setParticipants([{
        fullName: `${user.firstName} ${user.lastName}`,
        phone: user.phone || '',
        age: user.age,
      }]);
      loadActiveSubscription();
    }
  }, [isAuthenticated, user]);

  const loadActiveSubscription = async () => {
    try {
      const activeSub = await apiClient.users.getActiveSubscription();
      setSubscription(activeSub);
    } catch (err) {
      console.error('Error loading subscription:', err);
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
  };

  const handlePurchaseSubscription = async () => {
    // Получаем первый доступный тип абонемента
    try {
      const types = await apiClient.subscriptionTypes.getActive();
      if (types.length === 0) {
        setError('Нет доступных абонементов');
        return;
      }

      // Покупаем первый абонемент
      const payment = await apiClient.payments.initSubscriptionPayment(types[0].id);
      if (!payment?.paymentUrl) {
        setError('Не удалось создать платеж');
        return;
      }
      window.location.href = payment.paymentUrl;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при покупке абонемента');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;

    // Проверяем авторизацию
    if (!isAuthenticated) {
      setError('Необходимо войти в аккаунт для записи на направление');
      return;
    }

    // Проверяем наличие абонемента
    if (!subscription) {
      setError('Для записи на направление необходим активный абонемент');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.groupEnrollments.enroll({
        groupId: group.id,
        participants,
        contactEmail,
        subscriptionId: subscription.id,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при записи. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  if (success) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.successMessage}>
            <h2>✅ Вы записаны!</h2>
            <p>Вы успешно записались на направление "{group.name}"</p>
            <p>Теперь вам доступны все занятия по расписанию.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>

        <div className={styles.header}>
          <h2>Запись на направление</h2>
          <h3>{group.name}</h3>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formContent}>
            <div className={styles.enrollmentInfo}>
              <div className={styles.infoItem}>
                <span className={styles.icon}>📅</span>
                <div>
                  <strong>Расписание:</strong>
                  <p>{formatSchedule(group.schedule)}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.icon}>💰</span>
                <div>
                  <strong>Стоимость:</strong>
                  <p>{group.price} ₽ за занятие</p>
                </div>
              </div>
              <div className={styles.noteBox}>
                <strong>Важно:</strong> Вы записываетесь на все занятия по расписанию, а не на одно занятие.
              </div>
            </div>
          {!isAuthenticated ? (
            <div className={styles.warningBox}>
              <p>⚠️ Необходимо войти в аккаунт</p>
              <p>Для записи на направление нужна авторизация</p>
              <a href="/login" className={styles.link}>Войти в аккаунт</a>
            </div>
          ) : subscription ? (
            <div className={styles.subscriptionInfo}>
              <h4>✓ У вас есть активный абонемент</h4>
              <p>{subscription.name} - осталось {subscription.remainingBalance.toFixed(2)}₽</p>
              <p className={styles.note}>При оплате с абонемента действует скидка 10%</p>
            </div>
          ) : (
            <div className={styles.warningBox}>
              <p>⚠️ У вас нет активного абонемента</p>
              <p>Для записи на направление необходим абонемент</p>
              <button type="button" onClick={handlePurchaseSubscription} className={styles.purchaseButton}>
                Купить фиктивный абонемент
              </button>
            </div>
          )}

          <div className={styles.section}>
            <h4>Контактная информация</h4>
            <div className={styles.formGroup}>
              <label>Email для связи *</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.section}>
            <h4>Участник</h4>
            {participants.map((participant, index) => (
              <div key={index} className={styles.participant}>
                <div className={styles.formGroup}>
                  <label>Полное имя *</label>
                  <input
                    type="text"
                    value={participant.fullName}
                    onChange={(e) => handleParticipantChange(index, 'fullName', e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Телефон *</label>
                  <input
                    type="tel"
                    value={participant.phone}
                    onChange={(e) => handleParticipantChange(index, 'phone', e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Возраст (опционально)</label>
                  <input
                    type="number"
                    value={participant.age || ''}
                    onChange={(e) => handleParticipantChange(index, 'age', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Отмена
            </button>
            {isAuthenticated && subscription && (
              <button type="submit" disabled={loading} className={styles.submitButton}>
                {loading ? 'Записываем...' : 'Записаться на направление'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
