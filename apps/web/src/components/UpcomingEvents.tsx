'use client';

import { useState } from 'react';
import styles from './UpcomingEvents.module.css';
import { Event, EVENT_COLORS } from '@mss/shared';
import { getImageUrl } from '../lib/utils';
import EventModal from './EventModal';

interface UpcomingEventsProps {
  events: Event[];
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date);
    const day = date.getDate();
    const month = new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date);
    const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);

    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} ${month} · ${time}`;
  };

  const getTimeOfDay = (dateString: Date) => {
    const hour = new Date(dateString).getHours();
    if (hour >= 6 && hour < 12) return 'Утро';
    if (hour >= 12 && hour < 18) return 'День';
    if (hour >= 18 && hour < 23) return 'Вечер';
    return null;
  };

  const getDifficultyLabel = (difficulty?: string) => {
    if (!difficulty) return null;
    switch (difficulty.toUpperCase()) {
      case 'BEGINNER':
        return 'Начинающий';
      case 'INTERMEDIATE':
        return 'Средний';
      case 'ADVANCED':
        return 'Продвинутый';
      default:
        return null;
    }
  };

  const getDuration = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));

    if (durationMinutes < 60) {
      return `${durationMinutes} мин`;
    }

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
    }

    return `${hours},${Math.floor(minutes / 6)} часа`;
  };

  if (!events || events.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Ближайших мастер-классов пока нет</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.title}>Ближайшие мастер-классы</h2>
        <div className={styles.grid}>
          {events.map((event) => {
            const availableSeats = event.maxParticipants - event.currentParticipants;
            const timeOfDay = getTimeOfDay(event.startDate);
            const difficulty = getDifficultyLabel((event as any).difficulty);
            const duration = getDuration(event.startDate, event.endDate);

            return (
              <div key={event.id} className={styles.card}>
                <div className={styles.cardBadge}>
                  {event.type === 'MASTER_CLASS' && 'Мастер-класс'}
                  {event.type === 'REGULAR_GROUP' && 'Группа'}
                  {event.type === 'ONE_TIME_EVENT' && 'Событие'}
                </div>

                {event.imageUrl && (
                  <div
                    className={styles.cardImage}
                    style={{ backgroundImage: `url(${getImageUrl(event.imageUrl)})` }}
                  />
                )}

                <div className={styles.cardContent}>
                  <h3>{event.title}</h3>

                  <div className={styles.cardDate}>
                    <span>{formatDate(event.startDate)}</span>
                    {timeOfDay && (
                      <span className={styles.cardTimeChip}>{timeOfDay}</span>
                    )}
                    <span className={styles.cardSeatsChip}>
                      {availableSeats} {availableSeats === 1 ? 'место' : availableSeats < 5 ? 'места' : 'мест'}
                    </span>
                  </div>

                  <div className={styles.cardAttributes}>
                    <span className={styles.cardAttribute}>{duration}</span>
                    {difficulty && (
                      <span className={styles.cardAttribute}>Уровень: {difficulty}</span>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.cardPrice}>{event.price} ₽</span>
                  </div>

                  <button
                    className={styles.cardButton}
                    onClick={() => setSelectedEvent(event)}
                  >
                    Записаться
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </>
  );
}
