'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import styles from './bookings.module.css';
import { PaymentMethod } from '@mss/shared';

interface BookingParticipant {
  fullName: string;
  phone: string;
  age?: number;
}

interface BookingWithDetails {
  id: string;
  eventId?: string;
  groupSessionId?: string;
  status: string;
  participantsCount: number;
  totalPrice: number;
  participants: BookingParticipant[];
  contactEmail: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: Date;
  event?: {
    title: string;
    startDate: Date;
    type: string;
  };
  groupSession?: {
    date: Date;
    group?: {
      name: string;
    };
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadBookings();
  }, [page, filter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const result = await apiClient.bookings.getListPaginated(page, 25, {
        status: filter === 'all' ? undefined : filter,
        eventOnly: true,
      });
      setBookings(result.data as any);
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error('Ошибка загрузки записей:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Ожидает',
      CONFIRMED: 'Подтверждена',
      CANCELLED: 'Отменена',
      ATTENDED: 'Посетил',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      PENDING: styles.statusPending,
      CONFIRMED: styles.statusConfirmed,
      CANCELLED: styles.statusCancelled,
      ATTENDED: styles.statusAttended,
    };
    return classes[status] || '';
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.bookings.updateStatus(id, status);
      await loadBookings();
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      alert('Не удалось обновить статус');
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Записи на мастер-классы</h1>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Всего записей:</span>
            <span className={styles.statValue}>{total}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>На странице:</span>
            <span className={styles.statValue}>{bookings.length}</span>
          </div>
        </div>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`}
          onClick={() => {
            setPage(1);
            setFilter('all');
          }}
        >
          Все
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'PENDING' ? styles.filterActive : ''}`}
          onClick={() => {
            setPage(1);
            setFilter('PENDING');
          }}
        >
          Ожидают
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'CONFIRMED' ? styles.filterActive : ''}`}
          onClick={() => {
            setPage(1);
            setFilter('CONFIRMED');
          }}
        >
          Подтверждены
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'ATTENDED' ? styles.filterActive : ''}`}
          onClick={() => {
            setPage(1);
            setFilter('ATTENDED');
          }}
        >
          Посетили
        </button>
        <button
          className={`${styles.filterBtn} ${filter === 'CANCELLED' ? styles.filterActive : ''}`}
          onClick={() => {
            setPage(1);
            setFilter('CANCELLED');
          }}
        >
          Отменены
        </button>
      </div>

      {filteredBookings.length === 0 ? (
        <div className={styles.empty}>
          <p>Нет записей с выбранным статусом</p>
        </div>
      ) : (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Дата записи</th>
                <th>Мастер-класс</th>
                <th>Дата события</th>
                <th>Участники</th>
                <th>Email для связи</th>
                <th>Оплата</th>
                <th>Комментарий</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{formatDate(booking.createdAt)}</td>
                  <td>
                    <strong>
                      {booking.event
                        ? booking.event.title
                        : booking.groupSession
                          ? `${booking.groupSession.group?.name || 'Направление'}`
                          : 'Неизвестно'}
                    </strong>
                  </td>
                  <td>{booking.event ? formatDate(booking.event.startDate) : booking.groupSession ? formatDate(booking.groupSession.date) : '—'}</td>
                  <td>
                    <div className={styles.participants}>
                      {booking.participants.map((participant, idx) => (
                        <div key={idx} className={styles.participantInfo}>
                          <strong>{participant.fullName}</strong>
                          <span>{participant.phone}</span>
                          {participant.age && <span>Возраст: {participant.age}</span>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>{booking.contactEmail}</td>
                  <td>
                    {booking.paymentMethod === 'SUBSCRIPTION' ? 'Абонемент' : 'На месте'}
                  </td>
                  <td className={styles.notes}>{booking.notes || '—'}</td>
                  <td className={styles.price}>{booking.totalPrice} ₽</td>
                  <td>
                    <span className={`${styles.status} ${getStatusClass(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {booking.status === 'PENDING' && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 'CONFIRMED')}
                          className={styles.btnConfirm}
                        >
                          Подтвердить
                        </button>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 'ATTENDED')}
                          className={styles.btnAttended}
                        >
                          Посетил
                        </button>
                      )}
                      {booking.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(booking.id, 'CANCELLED')}
                          className={styles.btnCancel}
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            ← Назад
          </button>
          <span className={styles.pageInfo}>
            Страница {page} из {totalPages}
          </span>
          <button
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
