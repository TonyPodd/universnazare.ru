'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api';
import { Event } from '@mss/shared';
import styles from './events.module.css';
import { safeGetToken } from '../../lib/token-storage';

interface Booking {
  id: string;
  participantsCount: number;
  totalPrice: number;
  status: string;
  paymentMethod: string;
  participants: Array<{ fullName: string; phone: string; age?: number }>;
  contactEmail: string;
  createdAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await apiClient.events.getList(1, 100);
      setEvents(data.data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это событие?')) return;

    try {
      await apiClient.events.delete(id);
      await loadEvents();
      alert('Событие удалено');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Ошибка при удалении события');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await apiClient.events.publish(id);
      await loadEvents();
      alert('Событие опубликовано');
    } catch (error) {
      console.error('Error publishing event:', error);
      alert('Ошибка при публикации');
    }
  };

  const loadBookings = async (eventId: string) => {
    setLoadingBookings(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const token = safeGetToken();
      const response = await fetch(`${apiUrl}/bookings/event/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
      alert('Ошибка загрузки списка участников');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleViewParticipants = async (event: Event) => {
    setSelectedEvent(event);
    await loadBookings(event.id);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    setBookings([]);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'Ожидает',
      CONFIRMED: 'Подтвержден',
      CANCELLED: 'Отменен',
      ATTENDED: 'Посетил',
    };
    return statusMap[status] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    return method === 'SUBSCRIPTION' ? 'Абонемент' : 'На месте';
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Управление событиями</h1>
        <Link href="/events/new" className={styles.addButton}>
          + Создать событие
        </Link>
      </div>

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Тип</th>
              <th>Дата начала</th>
              <th>Цена</th>
              <th>Мест</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.title}</td>
                <td>
                  <span className={`${styles.badge} ${styles[event.type]}`}>
                    {event.type === 'MASTER_CLASS' && 'МК'}
                    {event.type === 'REGULAR_GROUP' && 'Группа'}
                    {event.type === 'ONE_TIME_EVENT' && 'Событие'}
                  </span>
                </td>
                <td>{formatDate(event.startDate)}</td>
                <td>{event.price} ₽</td>
                <td>
                  {event.currentParticipants}/{event.maxParticipants}
                </td>
                <td>
                  <span className={`${styles.status} ${styles[event.status]}`}>
                    {event.status === 'PUBLISHED' && 'Опубликовано'}
                    {event.status === 'DRAFT' && 'Черновик'}
                    {event.status === 'CANCELLED' && 'Отменено'}
                    {event.status === 'COMPLETED' && 'Завершено'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    {event.status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublish(event.id)}
                        className={styles.publishBtn}
                      >
                        Опубликовать
                      </button>
                    )}
                    {event.currentParticipants > 0 && (
                      <button
                        onClick={() => handleViewParticipants(event)}
                        className={styles.viewBtn}
                      >
                        Участники
                      </button>
                    )}
                    <Link href={`/events/${event.id}/edit`} className={styles.editBtn}>
                      Редактировать
                    </Link>
                    <button onClick={() => handleDelete(event.id)} className={styles.deleteBtn}>
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className={styles.empty}>
            <p>Событий пока нет. Создайте первое!</p>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className={styles.modal} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Участники: {selectedEvent.title}</h2>
              <button onClick={handleCloseModal} className={styles.closeButton}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {loadingBookings ? (
                <div className={styles.modalLoading}>Загрузка...</div>
              ) : bookings.length === 0 ? (
                <div className={styles.modalEmpty}>Записей пока нет</div>
              ) : (
                <>
                  <div className={styles.bookingsStats}>
                    <p>Всего записей: {bookings.length}</p>
                    <p>
                      Всего участников:{' '}
                      {bookings.reduce((sum, b) => sum + b.participantsCount, 0)}
                    </p>
                    <p>
                      Общая сумма:{' '}
                      {bookings.reduce((sum, b) => sum + b.totalPrice, 0).toFixed(2)} ₽
                    </p>
                  </div>

                  <div className={styles.bookingsList}>
                    {bookings.map((booking, index) => (
                      <div key={booking.id} className={styles.bookingCard}>
                        <div className={styles.bookingHeader}>
                          <span className={styles.bookingNumber}>Запись #{index + 1}</span>
                          <span
                            className={`${styles.bookingStatus} ${
                              styles[booking.status]
                            }`}
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>

                        <div className={styles.bookingInfo}>
                          {booking.user && (
                            <p>
                              <strong>Пользователь:</strong> {booking.user.firstName}{' '}
                              {booking.user.lastName}
                            </p>
                          )}
                          <p>
                            <strong>Email:</strong>{' '}
                            {booking.user?.email || booking.contactEmail}
                          </p>
                          {booking.user?.phone && (
                            <p>
                              <strong>Телефон:</strong> {booking.user.phone}
                            </p>
                          )}
                          <p>
                            <strong>Способ оплаты:</strong>{' '}
                            {getPaymentMethodLabel(booking.paymentMethod)}
                          </p>
                          <p>
                            <strong>Сумма:</strong> {booking.totalPrice.toFixed(2)} ₽
                          </p>
                          <p>
                            <strong>Дата записи:</strong> {formatDate(booking.createdAt)}
                          </p>
                        </div>

                        {booking.participants.length > 0 && (
                          <div className={styles.participants}>
                            <strong>
                              Участники ({booking.participants.length}):
                            </strong>
                            {booking.participants.map((participant, idx) => (
                              <div key={idx} className={styles.participant}>
                                <span>{participant.fullName}</span>
                                <span>{participant.phone}</span>
                                {participant.age && <span>{participant.age} лет</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
